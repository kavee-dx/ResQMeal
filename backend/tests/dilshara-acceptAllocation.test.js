// Donor acceptance now links a request and donation first; the donor previews
// candidates and explicitly chooses one before an assignment is created.
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

const { acceptFoodRequest } = require("../src/services/dushani-requestBoardService");
const {
  rankVolunteersForDelivery,
  assignSuggestedVolunteerForDelivery,
} = require("../src/services/dilshara-assignmentAllocation.service");

// Pinned clock: Thursday 2026-10-15, 08:30 Sri Lanka time. resolveLinkedDonation
// checks Date.now() and the allocation builds its pickup window from
// new Date(), so both must see the same instant.
const RealDate = Date;
const REAL_NOW = RealDate.now;
const FAKE_NOW = new RealDate("2026-10-15T03:00:00.000Z").getTime();

const MINUTE = 60 * 1000;
const WINDOW_START = new RealDate(FAKE_NOW + 30 * MINUTE);
const WINDOW_END = new RealDate(FAKE_NOW + 150 * MINUTE);
const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const COLOMBO_CENTRE = { latitude: 6.9271, longitude: 79.8612 };

let counter = 0;
const nextUnique = () => ++counter;

async function makeUser({ role, district = "Colombo", approvalStatus } = {}) {
  const n = nextUnique();
  return User.create({
    fullName: `Accept Test ${role} ${n}`,
    email: `accept-test-${n}@resqmeal.test`,
    phoneNumber: `0771${String(n).padStart(6, "0")}`,
    password: "not-used-in-tests",
    role,
    address: `${district} test address`,
    district,
    city: district,
    ...(approvalStatus ? { approvalStatus } : {}),
  });
}

async function makeVolunteer({ availabilityStatus = "AVAILABLE" } = {}) {
  const user = await makeUser({ role: "VOLUNTEER", approvalStatus: "APPROVED" });
  await VolunteerProfile.create({
    userId: user._id,
    vehicleType: "MOTORBIKE",
    vehicleNumber: `TEST-${nextUnique()}`,
    preferredDeliveryArea: "Colombo",
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
    maxDeliveryDistance: 20,
    location: {
      latitude: COLOMBO_CENTRE.latitude,
      longitude: COLOMBO_CENTRE.longitude,
      updatedAt: new RealDate(FAKE_NOW),
    },
  });
  return user;
}

// A live donation plus the recipient's still-waiting request, ready to claim.
async function makeClaimableScenario() {
  const donor = await makeUser({ role: "DONOR" });
  const recipient = await makeUser({ role: "RECIPIENT" });

  const donation = await Donation.create({
    donor: donor._id,
    foodType: "Cooked rice",
    foodCategory: "Cooked meals",
    quantity: 20,
    quantityUnit: "kg",
    numberOfPortions: 40,
    preparationTime: new RealDate(FAKE_NOW - 60 * MINUTE),
    expiryTime: new RealDate(FAKE_NOW + 6 * 60 * MINUTE),
    availabilityStart: new RealDate(FAKE_NOW),
    availabilityEnd: new RealDate(FAKE_NOW + 300 * MINUTE),
    pickupAddress: "12 Galle Road, Colombo",
    pickupDistrict: "Colombo",
    pickupWindowStart: WINDOW_START,
    pickupWindowEnd: WINDOW_END,
    status: "active",
  });

  const request = await FoodRequest.create({
    recipient: recipient._id,
    foodType: "Cooked rice",
    quantity: "20 packets",
    location: "Kaduwela, Colombo",
    contactNumber: "0771234567",
    status: "PENDING",
    expiresAt: new RealDate(FAKE_NOW + 3 * 60 * MINUTE),
  });

  return { donor, recipient, donation, request };
}

const claim = (donor, request, donation) =>
  acceptFoodRequest({
    donorId: String(donor._id),
    role: "DONOR",
    requestId: String(request._id),
    ...(donation ? { donationId: String(donation._id) } : {}),
  });

beforeAll(() => {
  RealDate.now = () => FAKE_NOW;
  global.Date = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      return args.length === 0
        ? Reflect.construct(target, [FAKE_NOW], newTarget)
        : Reflect.construct(target, args, newTarget);
    },
  });
});

afterAll(() => {
  RealDate.now = REAL_NOW;
  global.Date = RealDate;
});

describe("Dilshara accept-to-volunteer-suggestions flow", () => {
  beforeEach(() => {
    notify.mockReset();
    notify.mockResolvedValue({ created: 1 });
  });

  afterEach(async () => {
    jest.restoreAllMocks();
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

  test("claiming links the donation, previews eligible volunteers, then assigns the donor's choice", async () => {
    const { donor, donation, request } = await makeClaimableScenario();
    const volunteer = await makeVolunteer();

    const result = await claim(donor, request, donation);

    expect(result.status).toBe("MATCHED");
    expect(result.linkedDonation).toMatchObject({ id: String(donation._id) });
    expect("volunteerMatching" in result).toBe(false);

    const savedRequest = await FoodRequest.findById(request._id).lean();
    expect(savedRequest.status).toBe("MATCHED");
    expect(String(savedRequest.acceptedBy)).toBe(String(donor._id));
    expect(String(savedRequest.linkedDonation)).toBe(String(donation._id));
    expect(await Assignment.countDocuments({})).toBe(0);
    expect(notify).not.toHaveBeenCalled();

    const preview = await rankVolunteersForDelivery(String(donation._id), { now: new RealDate(FAKE_NOW) });
    expect(preview.ok).toBe(true);
    expect(preview.ranked[0].userId).toBe(String(volunteer._id));
    expect(preview.ranked[0].volunteer.displayName).toBe(volunteer.fullName);

    const outcome = await assignSuggestedVolunteerForDelivery(
      String(donation._id),
      String(volunteer._id),
      { now: new RealDate(FAKE_NOW) },
    );
    expect(outcome.status).toBe("ASSIGNED");

    const assignments = await Assignment.find({}).lean();
    expect(assignments).toHaveLength(1);
    expect(assignments[0].status).toBe("ASSIGNED");
    expect(assignments[0].isActive).toBe(true);
    expect(String(assignments[0].volunteerId)).toBe(String(volunteer._id));
    expect(String(assignments[0].requestId)).toBe(String(request._id));

    expect(notify).toHaveBeenCalledTimes(1);
    const [type, userIds] = notify.mock.calls[0];
    expect(type).toBe("ASSIGNMENT_OFFERED");
    expect(userIds.map(String)).toEqual([String(volunteer._id)]);
  });

  test("no eligible volunteers leaves the linked request intact and creates no assignment", async () => {
    const { donor, donation, request } = await makeClaimableScenario();
    await makeVolunteer({ availabilityStatus: "UNAVAILABLE" });

    const result = await claim(donor, request, donation);

    expect(result.status).toBe("MATCHED");
    expect("volunteerMatching" in result).toBe(false);
    const preview = await rankVolunteersForDelivery(String(donation._id), { now: new RealDate(FAKE_NOW) });
    expect(preview.ok).toBe(true);
    expect(preview.ranked).toHaveLength(0);

    const savedRequest = await FoodRequest.findById(request._id).lean();
    expect(savedRequest.status).toBe("MATCHED");
    expect(String(savedRequest.acceptedBy)).toBe(String(donor._id));
    expect(String(savedRequest.linkedDonation)).toBe(String(donation._id));

    expect(await Assignment.countDocuments({})).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  test("a duplicate claim is refused and never creates an assignment", async () => {
    const { donor, donation, request } = await makeClaimableScenario();
    await makeVolunteer();

    const first = await claim(donor, request, donation);
    expect(first.status).toBe("MATCHED");

    await expect(claim(donor, request, null)).rejects.toMatchObject({ statusCode: 409 });

    expect(await Assignment.countDocuments({})).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  test("claiming a donation does not change an existing assignment", async () => {
    const { donor, donation, request } = await makeClaimableScenario();
    const volunteer = await makeVolunteer();
    await Assignment.create({
      donationId: donation._id,
      volunteerId: volunteer._id,
      status: "ASSIGNED",
    });

    const result = await claim(donor, request, donation);

    expect(result.status).toBe("MATCHED");
    expect("volunteerMatching" in result).toBe(false);
    expect(await Assignment.countDocuments({})).toBe(1);
    expect(notify).not.toHaveBeenCalled();
  });

  test("a failed offer notification does not undo the donor-selected assignment", async () => {
    const { donor, donation, request } = await makeClaimableScenario();
    const volunteer = await makeVolunteer();

    notify.mockRejectedValueOnce(new Error("push service is down"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await claim(donor, request, donation);
    const outcome = await assignSuggestedVolunteerForDelivery(
      String(donation._id),
      String(volunteer._id),
      { now: new RealDate(FAKE_NOW) },
    );
    consoleError.mockRestore();

    expect(result.status).toBe("MATCHED");
    expect(outcome.status).toBe("ASSIGNED");

    const savedRequest = await FoodRequest.findById(request._id).lean();
    expect(savedRequest.status).toBe("MATCHED");
    const assignments = await Assignment.find({}).lean();
    expect(assignments).toHaveLength(1);
    expect(assignments[0].isActive).toBe(true);
  });

  test("an assignment error does not roll back the already accepted request", async () => {
    const { donor, donation, request } = await makeClaimableScenario();
    const volunteer = await makeVolunteer();

    jest.spyOn(Assignment, "create").mockRejectedValueOnce(new Error("database is down"));

    const result = await claim(donor, request, donation);
    await expect(
      assignSuggestedVolunteerForDelivery(
        String(donation._id),
        String(volunteer._id),
        { now: new RealDate(FAKE_NOW) },
      ),
    ).rejects.toThrow("database is down");

    expect(result.status).toBe("MATCHED");

    const savedRequest = await FoodRequest.findById(request._id).lean();
    expect(savedRequest.status).toBe("MATCHED");
    expect(String(savedRequest.acceptedBy)).toBe(String(donor._id));
    expect(await Assignment.countDocuments({})).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });

  test("a claim without a donation records MATCHED without volunteer matching", async () => {
    const { donor, request } = await makeClaimableScenario();
    await makeVolunteer();

    const result = await claim(donor, request, null);

    expect(result.status).toBe("MATCHED");
    expect(result.linkedDonation).toBeNull();
    expect("volunteerMatching" in result).toBe(false);

    const savedRequest = await FoodRequest.findById(request._id).lean();
    expect(savedRequest.status).toBe("MATCHED");
    expect(String(savedRequest.acceptedBy)).toBe(String(donor._id));
    expect(savedRequest.linkedDonation).toBeNull();

    expect(await Assignment.countDocuments({})).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });
});
