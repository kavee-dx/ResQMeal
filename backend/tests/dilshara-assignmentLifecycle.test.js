// Step 10 - volunteer lifecycle actions on an assignment. Every case goes
// through the real changeAssignmentStatus service, and where it fires, the
// real re-matching path (allocation service against the in-memory database
// with a pinned clock), so transitions, side effects and re-matching are the
// production code paths end to end.
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
const { assignVolunteerForDelivery } = require("../src/services/dilshara-assignmentAllocation.service");
const { cancelFoodRequest } = require("../src/services/dushani-cancelFoodRequestService");
const {
  changeAssignmentStatus,
  cancelActiveAssignmentsForRequest,
} = require("../src/services/dilshara-assignmentLifecycle.service");

// Pinned clock: Thursday 2026-10-15, 08:30 Sri Lanka time. Re-matching builds
// the pickup window from new Date(), so it must see the same instant as the
// donation fixture.
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
    fullName: `Lifecycle Test ${role} ${n}`,
    email: `lifecycle-test-${n}@resqmeal.test`,
    phoneNumber: `0772${String(n).padStart(6, "0")}`,
    password: "not-used-in-tests",
    role,
    address: `${district} test address`,
    district,
    city: district,
    ...(approvalStatus ? { approvalStatus } : {}),
  });
}

async function makeVolunteer() {
  const user = await makeUser({ role: "VOLUNTEER", approvalStatus: "APPROVED" });
  await VolunteerProfile.create({
    userId: user._id,
    vehicleType: "MOTORBIKE",
    vehicleNumber: `TEST-${nextUnique()}`,
    preferredDeliveryArea: "Colombo",
  });
  await VolunteerAvailability.create({
    userId: user._id,
    availabilityStatus: "AVAILABLE",
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
    expiresAt: new RealDate(FAKE_NOW + 3 * MINUTE),
  });

  return { donor, recipient, donation, request };
}

// Claims the request, then simulates the donor selecting the top-ranked
// volunteer before lifecycle tests exercise the resulting assignment.
async function claimAndGetAssignment({ volunteerCount = 1 } = {}) {
  const scenario = await makeClaimableScenario();
  const volunteers = [];
  for (let i = 0; i < volunteerCount; i += 1) volunteers.push(await makeVolunteer());

  const result = await acceptFoodRequest({
    donorId: String(scenario.donor._id),
    role: "DONOR",
    requestId: String(scenario.request._id),
    donationId: String(scenario.donation._id),
  });
  const outcome = await assignVolunteerForDelivery(String(scenario.donation._id));
  const assignment = outcome.assignment;
  return { ...scenario, volunteers, assignment };
}

const notifyTypes = () => notify.mock.calls.map((call) => call[0]);
const advanceFull = (assignment, actorId, nextStatus) =>
  changeAssignmentStatus({
    assignmentId: String(assignment._id),
    actorId: String(actorId),
    nextStatus,
  });
const advance = async (assignment, actorId, nextStatus) =>
  (await advanceFull(assignment, actorId, nextStatus)).assignment;

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

describe("Dilshara assignment lifecycle (step 10)", () => {
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

  test("a volunteer can accept an assignment they own", async () => {
    const { assignment, donor, recipient } = await claimAndGetAssignment();
    notify.mockClear();

    const updated = await advance(assignment, assignment.volunteerId, "ACCEPTED");

    expect(updated.status).toBe("ACCEPTED");
    expect(updated.isActive).toBe(true);
    expect(updated.acceptedAt).toBeInstanceOf(Date);

    const saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("ACCEPTED");

    expect(notifyTypes()).toEqual(["ASSIGNMENT_ACCEPTED"]);
    const [, userIds] = notify.mock.calls[0];
    expect(userIds.map(String)).toEqual([String(donor._id), String(recipient._id)]);
  });

  test("a volunteer can decline an unaccepted assignment; repeated attempts are refused", async () => {
    const { assignment, donor } = await claimAndGetAssignment();
    notify.mockClear();

    const updated = await advance(assignment, assignment.volunteerId, "CANCELLED");

    expect(updated.status).toBe("CANCELLED");
    expect(updated.isActive).toBe(false);
    expect(updated.cancelledBy).toBe("VOLUNTEER");
    expect(updated.cancelledAt).toBeInstanceOf(Date);

    expect(notifyTypes()).toEqual(["ASSIGNMENT_DECLINED"]);
    const [, userIds] = notify.mock.calls[0];
    expect(userIds.map(String)).toEqual([String(donor._id)]);

    // The re-match ran, but the only volunteer declined, so nobody is left:
    // no new assignment and no repeated offer.
    expect(await Assignment.countDocuments({})).toBe(1);

    // Once cancelled the assignment is terminal - a repeat is a plain 400.
    await expect(advance(assignment, assignment.volunteerId, "CANCELLED")).rejects.toMatchObject({
      name: "AssignmentError",
      statusCode: 400,
    });
    expect(await Assignment.countDocuments({})).toBe(1);
    expect(notifyTypes()).toEqual(["ASSIGNMENT_DECLINED"]);
  });

  test("a decline re-matches the delivery to a different eligible volunteer", async () => {
    const { assignment, request, volunteers } = await claimAndGetAssignment({ volunteerCount: 2 });
    const declinedId = String(assignment.volunteerId);
    const replacement = volunteers.find((v) => String(v._id) !== declinedId);
    notify.mockClear();

    await advance(assignment, assignment.volunteerId, "CANCELLED");

    const rows = await Assignment.find({}).lean();
    expect(rows).toHaveLength(2);

    const fresh = rows.find((row) => row.status === "ASSIGNED");
    expect(fresh).toBeDefined();
    expect(fresh.isActive).toBe(true);
    // The decliner was excluded; the offer went to the other volunteer.
    expect(String(fresh.volunteerId)).toBe(String(replacement._id));
    expect(String(fresh.requestId)).toBe(String(request._id));

    expect(notifyTypes()).toEqual(["ASSIGNMENT_DECLINED", "ASSIGNMENT_OFFERED"]);
    const [, offerUserIds] = notify.mock.calls[1];
    expect(offerUserIds.map(String)).toEqual([String(replacement._id)]);
  });

  test("cancelling after accepting, but before pickup starts, re-matches the delivery", async () => {
    const { assignment, volunteers } = await claimAndGetAssignment({ volunteerCount: 2 });
    const cancelledId = String(assignment.volunteerId);
    const replacement = volunteers.find((v) => String(v._id) !== cancelledId);

    await advance(assignment, assignment.volunteerId, "ACCEPTED");
    notify.mockClear();

    await advance(assignment, assignment.volunteerId, "CANCELLED");

    expect(notifyTypes()).toEqual(["ASSIGNMENT_CANCELLED", "ASSIGNMENT_OFFERED"]);
    const [, cancelUserIds] = notify.mock.calls[0];
    expect(cancelUserIds).toHaveLength(2); // donor + recipient

    const fresh = await Assignment.findOne({ status: "ASSIGNED" }).lean();
    expect(fresh).not.toBeNull();
    expect(String(fresh.volunteerId)).toBe(String(replacement._id));
  });

  test("cancelling after pickup has started never re-matches automatically", async () => {
    const { assignment, volunteers } = await claimAndGetAssignment({ volunteerCount: 2 });
    expect(volunteers).toHaveLength(2);

    await advance(assignment, assignment.volunteerId, "ACCEPTED");
    await advance(assignment, assignment.volunteerId, "PICKING_UP");
    notify.mockClear();
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const updated = await advance(assignment, assignment.volunteerId, "CANCELLED");

    expect(updated.status).toBe("CANCELLED");
    expect(updated.cancelledBy).toBe("VOLUNTEER");

    // The parties are told (manual coordination), but no replacement is
    // dispatched even though an eligible volunteer exists.
    expect(notifyTypes()).toEqual(["ASSIGNMENT_CANCELLED"]);
    const [, userIds] = notify.mock.calls[0];
    expect(userIds).toHaveLength(2); // donor + recipient
    expect(consoleWarn).toHaveBeenCalled();

    const rows = await Assignment.find({}).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("CANCELLED");
  });

  test("a delivery already in transit cannot be cancelled", async () => {
    const { assignment } = await claimAndGetAssignment();

    await advance(assignment, assignment.volunteerId, "ACCEPTED");
    await advance(assignment, assignment.volunteerId, "PICKING_UP");
    await advance(assignment, assignment.volunteerId, "IN_TRANSIT");
    notify.mockClear();

    await expect(advance(assignment, assignment.volunteerId, "CANCELLED")).rejects.toMatchObject({
      name: "AssignmentError",
      statusCode: 400,
      message: "Cannot move from IN_TRANSIT to CANCELLED.",
    });

    const saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("IN_TRANSIT");
    expect(saved.cancelledBy).toBeNull();
    expect(notify).not.toHaveBeenCalled();
  });

  test("transitions outside the allowed map are rejected and change nothing", async () => {
    const { assignment } = await claimAndGetAssignment();
    notify.mockClear();

    for (const nextStatus of ["PICKING_UP", "DELIVERED", "ASSIGNED"]) {
      await expect(advance(assignment, assignment.volunteerId, nextStatus)).rejects.toMatchObject({
        statusCode: 400,
      });
    }

    let saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("ASSIGNED");

    // A finished delivery is terminal too.
    await Assignment.updateOne(
      { _id: assignment._id },
      { $set: { status: "DELIVERED", isActive: false } }
    );
    await expect(advance(assignment, assignment.volunteerId, "CANCELLED")).rejects.toMatchObject({
      statusCode: 400,
    });
    saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("DELIVERED");

    expect(notify).not.toHaveBeenCalled();
  });

  test("a missing status is refused", async () => {
    const { assignment } = await claimAndGetAssignment();

    await expect(advance(assignment, assignment.volunteerId, undefined)).rejects.toMatchObject({
      statusCode: 400,
      message: "A status is required.",
    });
  });

  test("only the assigned volunteer can change an assignment", async () => {
    const { assignment, volunteers } = await claimAndGetAssignment({ volunteerCount: 2 });
    const other = volunteers.find((v) => String(v._id) !== String(assignment.volunteerId));
    notify.mockClear();

    await expect(advance(assignment, other._id, "ACCEPTED")).rejects.toMatchObject({
      name: "AssignmentError",
      statusCode: 403,
      message: "This assignment isn't yours.",
    });

    const saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("ASSIGNED");
    expect(notify).not.toHaveBeenCalled();
  });

  test("unknown or malformed assignment ids are a 404", async () => {
    await expect(
      changeAssignmentStatus({
        assignmentId: "not-an-object-id",
        actorId: String(new mongoose.Types.ObjectId()),
        nextStatus: "ACCEPTED",
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    await expect(
      changeAssignmentStatus({
        assignmentId: String(new mongoose.Types.ObjectId()),
        actorId: String(new mongoose.Types.ObjectId()),
        nextStatus: "ACCEPTED",
      })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test("a stale copy of the assignment cannot apply a change after someone else moved it", async () => {
    const { assignment } = await claimAndGetAssignment();
    const stale = await Assignment.findById(assignment._id);
    notify.mockClear();

    // Someone else accepted while our actor was holding the stale copy.
    await Assignment.updateOne(
      { _id: assignment._id },
      { $set: { status: "ACCEPTED", acceptedAt: new Date() } }
    );
    jest.spyOn(Assignment, "findById").mockResolvedValueOnce(stale);

    await expect(advance(assignment, assignment.volunteerId, "CANCELLED")).rejects.toMatchObject({
      name: "AssignmentError",
      statusCode: 409,
      message: "This assignment was just updated. Refresh and try again.",
    });

    const saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("ACCEPTED");
    expect(saved.cancelledBy).toBeNull();
    expect(notify).not.toHaveBeenCalled();
  });

  test("two simultaneous accepts cannot both apply", async () => {
    const { assignment } = await claimAndGetAssignment();
    notify.mockClear();

    const settled = await Promise.allSettled([
      advance(assignment, assignment.volunteerId, "ACCEPTED"),
      advance(assignment, assignment.volunteerId, "ACCEPTED"),
    ]);

    const fulfilled = settled.filter((s) => s.status === "fulfilled");
    const rejected = settled.filter((s) => s.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect([400, 409]).toContain(rejected[0].reason.statusCode);

    const saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("ACCEPTED");
    // The acceptance side effect fired exactly once.
    expect(notifyTypes()).toEqual(["ASSIGNMENT_ACCEPTED"]);
  });

  test("a failed notification does not undo the accepted transition", async () => {
    const { assignment } = await claimAndGetAssignment();
    notify.mockClear();
    notify.mockRejectedValueOnce(new Error("push service is down"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const updated = await advance(assignment, assignment.volunteerId, "ACCEPTED");
    consoleError.mockRestore();

    expect(updated.status).toBe("ACCEPTED");
    const saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("ACCEPTED");
    expect(saved.acceptedAt).toBeInstanceOf(Date);
  });

  test("in-transit and delivered move the linked request through the request service", async () => {
    const { assignment, request } = await claimAndGetAssignment();
    const actorId = assignment.volunteerId;

    await advance(assignment, actorId, "ACCEPTED");
    await advance(assignment, actorId, "PICKING_UP");

    const inTransit = await advanceFull(assignment, actorId, "IN_TRANSIT");
    expect(inTransit.requestSync).toEqual({ status: "SYNCED" });
    expect((await FoodRequest.findById(request._id).lean()).status).toBe("DISPATCHED");

    const delivered = await advanceFull(assignment, actorId, "DELIVERED");
    expect(delivered.requestSync).toEqual({ status: "SYNCED" });

    const savedRequest = await FoodRequest.findById(request._id).lean();
    expect(savedRequest.status).toBe("FULFILLED");

    expect(notifyTypes()).toEqual([
      "ASSIGNMENT_OFFERED",
      "ASSIGNMENT_ACCEPTED",
      "DELIVERY_STARTED",
      "DELIVERY_COMPLETED",
    ]);
  });

  test("a request that can no longer be advanced does not undo the assignment transition", async () => {
    const { assignment, request } = await claimAndGetAssignment();
    // e.g. the recipient cancelled the request while the volunteer was en route.
    await FoodRequest.updateOne({ _id: request._id }, { $set: { status: "CANCELLED" } });

    await advance(assignment, assignment.volunteerId, "ACCEPTED");
    await advance(assignment, assignment.volunteerId, "PICKING_UP");
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const { assignment: updated, requestSync } = await advanceFull(
      assignment,
      assignment.volunteerId,
      "IN_TRANSIT"
    );

    expect(updated.status).toBe("IN_TRANSIT");
    // The failure is exposed for recovery, not just logged.
    expect(requestSync).toMatchObject({ status: "FAILED", requestId: String(request._id) });
    expect(requestSync.message).toMatch(/moved on/);

    const saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("IN_TRANSIT");
    expect((await FoodRequest.findById(request._id).lean()).status).toBe("CANCELLED");
    expect(consoleError).toHaveBeenCalled();
  });

  test("system cancellations free the volunteer without re-matching", async () => {
    const { assignment, request } = await claimAndGetAssignment();
    await advance(assignment, assignment.volunteerId, "ACCEPTED");
    notify.mockClear();

    const cancelled = await cancelActiveAssignmentsForRequest(request._id);

    expect(cancelled).toHaveLength(1);
    expect(cancelled[0].status).toBe("CANCELLED");
    expect(cancelled[0].cancelledBy).toBe("SYSTEM");

    const rows = await Assignment.find({}).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].isActive).toBe(false);

    expect(notifyTypes()).toEqual(["ASSIGNMENT_CANCELLED"]);
    const [, userIds] = notify.mock.calls[0];
    expect(userIds.map(String)).toEqual([String(assignment.volunteerId)]);
  });
});

describe("Dilshara lifecycle <-> request cancellation (step 11)", () => {
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

  test("a recipient cancelling before pickup ends the delivery and tells volunteer + donor", async () => {
    const { assignment, request, donor, recipient, donation } = await claimAndGetAssignment();
    await advance(assignment, assignment.volunteerId, "ACCEPTED");
    notify.mockClear();

    const result = await cancelFoodRequest(String(recipient._id), String(request._id));

    expect(result.status).toBe("CANCELLED");
    expect(result.releasedDonation).toMatchObject({ id: String(donation._id) });

    const saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("CANCELLED");
    expect(saved.cancelledBy).toBe("SYSTEM");
    expect(saved.isActive).toBe(false);
    expect((await FoodRequest.findById(request._id).lean()).status).toBe("CANCELLED");

    expect(notifyTypes()).toEqual(["ASSIGNMENT_CANCELLED", "REQUEST_CANCELLED"]);
    const [, volunteerIds] = notify.mock.calls[0];
    expect(volunteerIds.map(String)).toEqual([String(assignment.volunteerId)]);
    const [, donorIds] = notify.mock.calls[1];
    expect(donorIds.map(String)).toEqual([String(donor._id)]);

    // The request is cancelled — nobody is re-matched.
    expect(await Assignment.countDocuments({})).toBe(1);
  });

  test("cancelling after the food was collected frees the volunteer and carries the stage", async () => {
    const { assignment, request, recipient } = await claimAndGetAssignment();
    await advance(assignment, assignment.volunteerId, "ACCEPTED");
    await advance(assignment, assignment.volunteerId, "PICKING_UP");
    await advance(assignment, assignment.volunteerId, "IN_TRANSIT");
    notify.mockClear();

    const result = await cancelFoodRequest(String(recipient._id), String(request._id));
    expect(result.status).toBe("CANCELLED");

    const saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("CANCELLED");
    expect(saved.cancelledBy).toBe("SYSTEM");
    expect((await FoodRequest.findById(request._id).lean()).status).toBe("CANCELLED");

    // The volunteer learns the recipient cancelled and that the food was
    // already with them (stage on the notification data for the handover).
    const cancelCall = notify.mock.calls.find(([type]) => type === "ASSIGNMENT_CANCELLED");
    expect(cancelCall).toBeDefined();
    expect(cancelCall[2].previousStatus).toBe("IN_TRANSIT");
    expect(notifyTypes()).toContain("REQUEST_CANCELLED");

    expect(await Assignment.countDocuments({})).toBe(1);
  });

  test("a repeat cancel is refused and sends nothing more", async () => {
    const { assignment, request, recipient } = await claimAndGetAssignment();
    await advance(assignment, assignment.volunteerId, "ACCEPTED");
    await cancelFoodRequest(String(recipient._id), String(request._id));
    notify.mockClear();

    await expect(
      cancelFoodRequest(String(recipient._id), String(request._id))
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(notify).not.toHaveBeenCalled();
    const saved = await Assignment.findById(assignment._id).lean();
    expect(saved.status).toBe("CANCELLED");
  });

  test("only the request's own recipient can cancel it and its delivery", async () => {
    const { assignment, request } = await claimAndGetAssignment();
    await advance(assignment, assignment.volunteerId, "ACCEPTED");
    notify.mockClear();

    const stranger = await makeUser({ role: "RECIPIENT" });
    await expect(
      cancelFoodRequest(String(stranger._id), String(request._id))
    ).rejects.toMatchObject({ statusCode: 404 });

    expect((await FoodRequest.findById(request._id).lean()).status).toBe("MATCHED");
    expect((await Assignment.findById(assignment._id).lean()).status).toBe("ACCEPTED");
    expect(notify).not.toHaveBeenCalled();
  });

  test("a stranger cannot move the request through someone else's assignment", async () => {
    const { assignment, request, volunteers } = await claimAndGetAssignment({ volunteerCount: 2 });
    const other = volunteers.find((v) => String(v._id) !== String(assignment.volunteerId));
    notify.mockClear();

    await expect(advance(assignment, other._id, "ACCEPTED")).rejects.toMatchObject({
      statusCode: 403,
    });

    expect((await FoodRequest.findById(request._id).lean()).status).toBe("MATCHED");
    expect((await Assignment.findById(assignment._id).lean()).status).toBe("ASSIGNED");
    expect(notify).not.toHaveBeenCalled();
  });

  test("cancelling a request with no delivery still tells the donor", async () => {
    const { donor, recipient, request } = await makeClaimableScenario();
    await makeVolunteer();
    const accepted = await acceptFoodRequest({
      donorId: String(donor._id),
      role: "DONOR",
      requestId: String(request._id),
    });
    expect(accepted.status).toBe("MATCHED");
    expect("volunteerMatching" in accepted).toBe(false);
    notify.mockClear();

    const result = await cancelFoodRequest(String(recipient._id), String(request._id));

    expect(result.releasedDonation).toBeNull();
    expect(await Assignment.countDocuments({})).toBe(0);
    expect(notifyTypes()).toEqual(["REQUEST_CANCELLED"]);
  });

  test("a legacy assignment without a request id skips the sync instead of failing", async () => {
    const volunteerId = new mongoose.Types.ObjectId();
    const legacy = await Assignment.create({
      donationId: new mongoose.Types.ObjectId(),
      volunteerId,
      status: "ASSIGNED",
    });
    notify.mockClear();

    await advance(legacy, volunteerId, "ACCEPTED");
    await advance(legacy, volunteerId, "PICKING_UP");

    const inTransit = await advanceFull(legacy, volunteerId, "IN_TRANSIT");
    expect(inTransit.requestSync).toEqual({ status: "SKIPPED" });
    expect(inTransit.assignment.status).toBe("IN_TRANSIT");

    const delivered = await advanceFull(legacy, volunteerId, "DELIVERED");
    expect(delivered.requestSync).toEqual({ status: "SKIPPED" });
    expect(delivered.assignment.status).toBe("DELIVERED");

    // No phantom delivery notifications without a request to point at.
    expect(notifyTypes()).toEqual(["ASSIGNMENT_ACCEPTED"]);
  });
});
