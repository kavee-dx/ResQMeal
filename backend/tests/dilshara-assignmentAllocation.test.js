// Step 8 - the allocation entry points against a real (in-memory) database:
// ranked-order creation, duplicate-key fallbacks under concurrency, the two
// partial unique indexes, legacy compatibility and post-save notifications.
const mongoose = require("mongoose");

jest.mock("../src/services/amasha-notificationService", () => ({ notify: jest.fn() }));
const { notify } = require("../src/services/amasha-notificationService");

const User = require("../src/models/dushani-User");
const VolunteerProfile = require("../src/models/dushani-VolunteerProfile");
const VolunteerAvailability = require("../src/models/dilshara-VolunteerAvailability");
const VolunteerDeliveryPreferences = require("../src/models/dilshara-VolunteerDeliveryPreferences");
const Donation = require("../src/models/kaveesha-Donation");
const FoodRequest = require("../src/models/dushani-foodRequestModel");
const Assignment = require("../src/models/dilshara-Assignment");

const {
  rankVolunteersForDelivery,
  assignVolunteerForDelivery,
  findAndAssignVolunteer,
} = require("../src/services/dilshara-assignmentAllocation.service");

// Thursday 2026-10-15, 08:30 Sri Lanka time. Pickup window 09:00 - 11:00.
const NOW = new Date("2026-10-15T03:00:00.000Z");
const MINUTE = 60 * 1000;
const WINDOW_START = new Date(NOW.getTime() + 30 * MINUTE);
const WINDOW_END = new Date(NOW.getTime() + 150 * MINUTE);
const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const COLOMBO_CENTRE = { latitude: 6.9271, longitude: 79.8612 };
const FARTHER_POINT = { latitude: 6.85, longitude: 79.95 }; // ~13 km from the centre

let counter = 0;
const nextUnique = () => ++counter;

async function makeUser({ role, district = "Colombo", accountStatus, approvalStatus } = {}) {
  const n = nextUnique();
  return User.create({
    fullName: `Alloc Test ${role} ${n}`,
    email: `alloc-test-${n}@resqmeal.test`,
    phoneNumber: `0770${String(n).padStart(6, "0")}`,
    password: "not-used-in-tests",
    role,
    address: `${district} test address`,
    district,
    city: district,
    ...(accountStatus ? { accountStatus } : {}),
    ...(approvalStatus ? { approvalStatus } : {}),
  });
}

async function makeVolunteer({
  location = COLOMBO_CENTRE,
  maxDistance = 20,
  availabilityStatus = "AVAILABLE",
  district = "Colombo",
  preferredArea = "Colombo",
} = {}) {
  const user = await makeUser({ role: "VOLUNTEER", district, approvalStatus: "APPROVED" });
  await VolunteerProfile.create({
    userId: user._id,
    vehicleType: "MOTORBIKE",
    vehicleNumber: `TEST-${nextUnique()}`,
    preferredDeliveryArea: preferredArea,
  });
  await VolunteerAvailability.create({
    userId: user._id,
    availabilityStatus,
    availableDays: ALL_DAYS,
    availableFrom: "00:00",
    availableTo: "23:59",
  });
  await VolunteerDeliveryPreferences.create({
    userId: user._id,
    maxDeliveryDistance: maxDistance,
    location: {
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      updatedAt: location ? new Date() : null,
    },
  });
  return user;
}

async function makeDonation(donor, overrides = {}) {
  return Donation.create({
    donor: donor._id,
    foodType: "Cooked rice",
    foodCategory: "Cooked meals",
    quantity: 20,
    quantityUnit: "kg",
    numberOfPortions: 40,
    preparationTime: new Date(NOW.getTime() - 60 * MINUTE),
    expiryTime: new Date(NOW.getTime() + 6 * 60 * MINUTE),
    availabilityStart: NOW,
    availabilityEnd: new Date(NOW.getTime() + 300 * MINUTE),
    pickupAddress: "12 Galle Road, Colombo",
    pickupDistrict: "Colombo",
    pickupWindowStart: WINDOW_START,
    pickupWindowEnd: WINDOW_END,
    status: "active",
    ...overrides,
  });
}

async function makeRequest(donation, recipient) {
  return FoodRequest.create({
    recipient: recipient._id,
    foodType: "Cooked rice",
    quantity: "20 packets",
    location: "Kaduwela, Colombo",
    status: "MATCHED",
    acceptedBy: donation.donor,
    acceptedAt: new Date(NOW.getTime() - 10 * MINUTE),
    linkedDonation: donation._id,
  });
}

async function makeDeliverableDonation() {
  const donor = await makeUser({ role: "DONOR" });
  const recipient = await makeUser({ role: "RECIPIENT" });
  const donation = await makeDonation(donor);
  const request = await makeRequest(donation, recipient);
  return { donor, recipient, donation, request };
}

describe("Dilshara assignment allocation", () => {
  beforeAll(async () => {
    await Assignment.init(); // build the model's indexes before testing them
  });

  beforeEach(() => {
    notify.mockReset();
    notify.mockResolvedValue({ created: 1 });
  });

  afterEach(async () => {
    await Promise.all([
      Assignment.deleteMany({}),
      Donation.deleteMany({}),
      FoodRequest.deleteMany({}),
      User.deleteMany({}),
      VolunteerProfile.deleteMany({}),
      VolunteerAvailability.deleteMany({}),
      VolunteerDeliveryPreferences.deleteMany({}),
    ]);
  });

  describe("indexes enforce the one-active rules at the database level", () => {
    test("both partial unique indexes are built and cover active rows only", async () => {
      const indexes = await Assignment.collection.indexes();
      const byName = Object.fromEntries(indexes.map((index) => [index.name, index]));

      expect(byName.one_active_assignment_per_volunteer).toMatchObject({
        unique: true,
        key: { volunteerId: 1, isActive: 1 },
        partialFilterExpression: { isActive: true },
      });
      expect(byName.one_active_assignment_per_donation).toMatchObject({
        unique: true,
        key: { donationId: 1, isActive: 1 },
        partialFilterExpression: { isActive: true },
      });

      // The old non-unique helper index stays for "my assignments by status".
      expect(byName.volunteerId_1_status_1).toBeDefined();
    });
  });

  describe("legacy assignment compatibility", () => {
    test("a bare donation+volunteer assignment still validates and saves", async () => {
      const donation = new mongoose.Types.ObjectId();
      const volunteer = new mongoose.Types.ObjectId();

      const assignment = await Assignment.create({ donationId: donation, volunteerId: volunteer });

      expect(assignment.status).toBe("ASSIGNED");
      expect(assignment.isActive).toBe(true);
      expect(assignment.requestId).toBeNull();
      expect(assignment.matchScore).toBeNull();
      expect(assignment.cancelledBy).toBeNull();
    });

    test("a cancelled assignment is saved as inactive (status drives isActive)", async () => {
      const donation = new mongoose.Types.ObjectId();
      const volunteer = new mongoose.Types.ObjectId();

      const assignment = await Assignment.create({
        donationId: donation,
        volunteerId: volunteer,
        status: "CANCELLED",
        cancelledBy: "VOLUNTEER",
        cancelledAt: new Date(),
      });

      expect(assignment.isActive).toBe(false);
    });
  });

  describe("assignVolunteerForDelivery", () => {
    test("creates the assignment for the top-ranked volunteer with full match metadata", async () => {
      const { donation, request } = await makeDeliverableDonation();
      const best = await makeVolunteer({ location: COLOMBO_CENTRE });
      const farther = await makeVolunteer({ location: FARTHER_POINT });

      // The read-only ranking puts the closest volunteer first.
      const ranked = await rankVolunteersForDelivery(donation._id, { now: NOW });
      expect(ranked.ok).toBe(true);
      expect(ranked.ranked.map((entry) => entry.userId)).toEqual([
        String(best._id),
        String(farther._id),
      ]);

      // Prove the offer notification is only sent once the row is saved.
      let countWhenNotified = -1;
      notify.mockImplementationOnce(async () => {
        countWhenNotified = await Assignment.countDocuments({ donationId: donation._id });
        return { created: 1 };
      });

      const outcome = await assignVolunteerForDelivery(donation._id, { now: NOW });
      expect(outcome.status).toBe("ASSIGNED");

      const assignment = outcome.assignment;
      expect(String(assignment.volunteerId)).toBe(String(best._id));
      expect(String(assignment.requestId)).toBe(String(request._id));
      expect(String(assignment.donationId)).toBe(String(donation._id));
      expect(assignment.status).toBe("ASSIGNED");
      expect(assignment.isActive).toBe(true);
      expect(assignment.matchScore).toBe(ranked.ranked[0].score);
      expect(assignment.matchScore).toBeGreaterThan(0);
      expect(assignment.routeDistanceKm).toBeGreaterThanOrEqual(0);
      expect(["EXACT", "APPROXIMATE"]).toContain(assignment.locationPrecision);

      for (const key of ["distance", "area", "time", "urgency"]) {
        expect(assignment.matchBreakdown[key]).toMatchObject({
          score: expect.any(Number),
          points: expect.any(Number),
        });
      }
      expect(assignment.matchReasons.length).toBeGreaterThan(0);

      expect(notify).toHaveBeenCalledTimes(1);
      const [type, userIds, data] = notify.mock.calls[0];
      expect(type).toBe("ASSIGNMENT_OFFERED");
      expect(userIds.map(String)).toEqual([String(best._id)]);
      expect(String(data.assignmentId)).toBe(String(assignment._id));
      expect(countWhenNotified).toBe(1);

      expect(await Assignment.countDocuments({ donationId: donation._id })).toBe(1);
    });

    test("returns the existing active assignment instead of creating a duplicate", async () => {
      const { donation } = await makeDeliverableDonation();
      await makeVolunteer({ location: COLOMBO_CENTRE });

      const first = await assignVolunteerForDelivery(donation._id, { now: NOW });
      expect(first.status).toBe("ASSIGNED");

      const second = await assignVolunteerForDelivery(donation._id, { now: NOW });
      expect(second.status).toBe("ALREADY_ASSIGNED");
      expect(String(second.assignmentId)).toBe(String(first.assignment._id));

      const viaHelper = await findAndAssignVolunteer(donation._id, { now: NOW });
      expect(String(viaHelper._id)).toBe(String(first.assignment._id));

      expect(await Assignment.countDocuments({ donationId: donation._id })).toBe(1);
      expect(notify).toHaveBeenCalledTimes(1);
    });

    test("NO_ELIGIBLE_VOLUNTEER leaves the request MATCHED and nothing created", async () => {
      const { donation, request } = await makeDeliverableDonation();
      await makeVolunteer({ availabilityStatus: "UNAVAILABLE" });

      const outcome = await assignVolunteerForDelivery(donation._id, { now: NOW });
      expect(outcome).toEqual({ status: "NO_ELIGIBLE_VOLUNTEER" });

      expect(await Assignment.countDocuments({})).toBe(0);
      expect((await FoodRequest.findById(request._id).lean()).status).toBe("MATCHED");
      expect((await Donation.findById(donation._id).lean()).status).toBe("active");
      expect(await findAndAssignVolunteer(donation._id, { now: NOW })).toBeNull();
      expect(notify).not.toHaveBeenCalled();
    });

    test("a failed notification does not undo the saved assignment", async () => {
      const { donation } = await makeDeliverableDonation();
      await makeVolunteer({ location: COLOMBO_CENTRE });

      notify.mockRejectedValueOnce(new Error("push service is down"));
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

      const outcome = await assignVolunteerForDelivery(donation._id, { now: NOW });
      consoleError.mockRestore();

      expect(outcome.status).toBe("ASSIGNED");
      const saved = await Assignment.findById(outcome.assignment._id).lean();
      expect(saved).not.toBeNull();
      expect(saved.status).toBe("ASSIGNED");
      expect(saved.isActive).toBe(true);
    });

    test("two simultaneous allocations for one donation create exactly one assignment", async () => {
      const { donation } = await makeDeliverableDonation();
      await makeVolunteer({ location: COLOMBO_CENTRE });

      const outcomes = await Promise.all([
        assignVolunteerForDelivery(donation._id, { now: NOW }),
        assignVolunteerForDelivery(donation._id, { now: NOW }),
      ]);

      const assigned = outcomes.filter((outcome) => outcome.status === "ASSIGNED");
      const already = outcomes.filter((outcome) => outcome.status === "ALREADY_ASSIGNED");
      expect(assigned).toHaveLength(1);
      expect(already).toHaveLength(1);

      // The loser points at the winner's row, wherever the race resolved.
      expect(String(already[0].assignmentId)).toBe(String(assigned[0].assignment._id));

      const saved = await Assignment.find({ donationId: donation._id }).lean();
      expect(saved).toHaveLength(1);
      expect(saved[0].isActive).toBe(true);
      expect(notify).toHaveBeenCalledTimes(1);
    });

    test("a shared best volunteer cannot be double-booked; the second donation gets the next candidate", async () => {
      const donor = await makeUser({ role: "DONOR" });
      const recipient = await makeUser({ role: "RECIPIENT" });
      const shared = await makeVolunteer({ location: COLOMBO_CENTRE });
      const backup = await makeVolunteer({ location: FARTHER_POINT });

      const donationOne = await makeDonation(donor);
      await makeRequest(donationOne, recipient);
      const donationTwo = await makeDonation(donor);
      await makeRequest(donationTwo, recipient);

      const [first, second] = await Promise.all([
        assignVolunteerForDelivery(donationOne._id, { now: NOW }),
        assignVolunteerForDelivery(donationTwo._id, { now: NOW }),
      ]);

      expect(first.status).toBe("ASSIGNED");
      expect(second.status).toBe("ASSIGNED");

      const saved = await Assignment.find({}).lean();
      expect(saved).toHaveLength(2);

      const donationIds = new Set(saved.map((row) => String(row.donationId)));
      const volunteerIds = new Set(saved.map((row) => String(row.volunteerId)));
      expect(donationIds.size).toBe(2);
      expect(volunteerIds.size).toBe(2);
      expect(volunteerIds.has(String(shared._id))).toBe(true);
      expect(volunteerIds.has(String(backup._id))).toBe(true);

      for (const row of saved) {
        expect(row.status).toBe("ASSIGNED");
        expect(row.isActive).toBe(true);
      }
      expect(notify).toHaveBeenCalledTimes(2);
    });
  });
});
