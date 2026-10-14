// Steps 12–13 — the payload behind the volunteer's assignment screen and the
// map/navigation feature: GET /api/assignments/current returns the delivery
// view the app renders (pickup and drop-off points with honesty flags) plus
// the route stage navigation must follow. The security-relevant part is the
// recipient contact gate: the request's phone number is private until the
// volunteer commits to the delivery (accepts the assignment), and the gate
// must hold on the server no matter what the app asks for.
const User = require("../src/models/dushani-User");
const RecipientProfile = require("../src/models/dushani-RecipientProfile");
const Donation = require("../src/models/kaveesha-Donation");
const FoodRequest = require("../src/models/dushani-foodRequestModel");
const Assignment = require("../src/models/dilshara-Assignment");

const {
  getCurrentAssignment,
} = require("../src/controllers/dilshara-assignment.controller");

let counter = 0;
const nextUnique = () => ++counter;

const HOUR = 60 * 60 * 1000;

// Colombo district centre — the honest fallback placement for free-text
// addresses (backend/src/data/amasha-sriLankaDistricts.js). Never to be
// presented as an exact doorstep by consumers.
const COLOMBO = { latitude: 6.9271, longitude: 79.8612 };

async function makeUser({ role, district = "Colombo", fullName } = {}) {
  const n = nextUnique();
  return User.create({
    fullName: fullName === undefined ? `Controller Test ${role} ${n}` : fullName,
    email: `controller-test-${n}@resqmeal.test`,
    phoneNumber: `0773${String(n).padStart(6, "0")}`,
    password: "not-used-in-tests",
    role,
    address: `${district} test address`,
    district,
    city: district,
  });
}

async function makeScenario({
  assignmentStatus = "ASSIGNED",
  contactNumber = "0112345678",
  fullName,
  linkRequest = true,
  pickupAddress = "12 Galle Road, Colombo",
  pickupDistrict = "Colombo",
  requestLocation = "Colombo 05",
  recipientDistrict = "Colombo",
} = {}) {
  const donor = await makeUser({ role: "DONOR" });
  const recipient = await makeUser({
    role: "RECIPIENT",
    fullName,
    district: recipientDistrict,
  });
  const volunteer = await makeUser({ role: "VOLUNTEER" });

  const donation = await Donation.create({
    donor: donor._id,
    foodType: "Cooked rice",
    quantity: 20,
    quantityUnit: "kg",
    numberOfPortions: 40,
    preparationTime: new Date(Date.now() - HOUR),
    expiryTime: new Date(Date.now() + 6 * HOUR),
    availabilityStart: new Date(),
    availabilityEnd: new Date(Date.now() + 5 * HOUR),
    pickupAddress,
    pickupDistrict,
    status: "active",
  });

  let request = null;
  if (linkRequest) {
    request = await FoodRequest.create({
      recipient: recipient._id,
      foodType: "Cooked rice",
      quantity: "40 portions",
      location: requestLocation,
      contactNumber,
      status: "MATCHED",
      acceptedBy: donor._id,
      linkedDonation: donation._id,
    });
  }

  const assignment = await Assignment.create({
    donationId: donation._id,
    volunteerId: volunteer._id,
    requestId: request ? request._id : null,
    status: assignmentStatus,
    ...(assignmentStatus !== "ASSIGNED" ? { acceptedAt: new Date() } : {}),
  });

  return { donor, recipient, volunteer, donation, request, assignment };
}

function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
}

async function invoke(volunteerId) {
  const res = makeRes();
  await getCurrentAssignment({ user: { id: String(volunteerId) } }, res);
  return res;
}

describe("GET /api/assignments/current delivery view (steps 12–13)", () => {
  it("shows the pickup and drop-off points but withholds the recipient's number while ASSIGNED", async () => {
    const { volunteer } = await makeScenario({ assignmentStatus: "ASSIGNED" });

    const res = await invoke(volunteer._id);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.assignment.status).toBe("ASSIGNED");
    expect(res.body.delivery.status).toBe("ASSIGNED");
    expect(res.body.delivery.stage).toBe("TO_PICKUP");
    expect(res.body.delivery.pickup).toEqual({
      label: "12 Galle Road, Colombo",
      district: "Colombo",
      exact: false,
      ...COLOMBO,
    });
    expect(res.body.delivery.dropoff).toEqual({
      label: "Colombo 05",
      district: "Colombo",
      exact: false,
      ...COLOMBO,
    });
    // The offer is not a commitment yet — the number stays on the server.
    expect(res.body.delivery.recipientContact).toBeNull();
  });

  it("reveals the recipient's contact once the volunteer has accepted", async () => {
    const { volunteer, recipient } = await makeScenario({ assignmentStatus: "ACCEPTED" });

    const res = await invoke(volunteer._id);

    expect(res.body.assignment.status).toBe("ACCEPTED");
    // Still before pickup — the route target remains the donor.
    expect(res.body.delivery.stage).toBe("TO_PICKUP");
    expect(res.body.delivery.recipientContact).toEqual({
      name: recipient.fullName,
      phone: "0112345678",
    });
  });

  it("names organisation recipients from their recipient profile", async () => {
    const { volunteer, recipient } = await makeScenario({
      assignmentStatus: "ACCEPTED",
      fullName: null,
    });
    await RecipientProfile.create({
      userId: recipient._id,
      recipientType: "CHARITY",
      organizationName: "Hope Centre",
      peopleNeedingFood: 10,
      foodRequirements: ["RICE"],
    });

    const res = await invoke(volunteer._id);

    expect(res.body.delivery.recipientContact).toEqual({
      name: "Hope Centre",
      phone: "0112345678",
    });
  });

  it("keeps the contact null when the request never carried a number", async () => {
    const { volunteer } = await makeScenario({
      assignmentStatus: "ACCEPTED",
      contactNumber: "",
    });

    const res = await invoke(volunteer._id);

    expect(res.body.delivery.recipientContact).toBeNull();
  });

  it("keeps routing to the pickup while the food has not been collected", async () => {
    const { volunteer } = await makeScenario({ assignmentStatus: "PICKING_UP" });

    const res = await invoke(volunteer._id);

    expect(res.body.delivery.status).toBe("PICKING_UP");
    expect(res.body.delivery.stage).toBe("TO_PICKUP");
    expect(res.body.delivery.pickup).toEqual({
      label: "12 Galle Road, Colombo",
      district: "Colombo",
      exact: false,
      ...COLOMBO,
    });
  });

  it("switches to the drop-off leg once the food is on board", async () => {
    const { volunteer } = await makeScenario({ assignmentStatus: "IN_TRANSIT" });

    const res = await invoke(volunteer._id);

    expect(res.body.delivery.status).toBe("IN_TRANSIT");
    // The pickup is done — the only remaining route is pickup → recipient.
    expect(res.body.delivery.stage).toBe("TO_DROPOFF");
    expect(res.body.delivery.dropoff).toEqual({
      label: "Colombo 05",
      district: "Colombo",
      exact: false,
      ...COLOMBO,
    });
  });

  it("falls back to pickup only for a legacy assignment without a request", async () => {
    const { volunteer } = await makeScenario({ linkRequest: false });

    const res = await invoke(volunteer._id);

    expect(res.body.delivery.status).toBe("ASSIGNED");
    expect(res.body.delivery.stage).toBe("TO_PICKUP");
    expect(res.body.delivery.pickup).toEqual({
      label: "12 Galle Road, Colombo",
      district: "Colombo",
      exact: false,
      ...COLOMBO,
    });
    expect(res.body.delivery.dropoff).toBeNull();
    expect(res.body.delivery.recipientContact).toBeNull();
  });

  it("returns a null pickup instead of a made-up pin when the donation has no location", async () => {
    const { volunteer } = await makeScenario({ pickupAddress: "", pickupDistrict: "" });

    const res = await invoke(volunteer._id);

    expect(res.body.delivery.pickup).toBeNull();
    // The stage still tells the app what leg this is — it just has no
    // coordinates to draw.
    expect(res.body.delivery.stage).toBe("TO_PICKUP");
  });

  it("labels an unresolvable drop-off honestly and invents no coordinates", async () => {
    const { volunteer } = await makeScenario({
      assignmentStatus: "IN_TRANSIT",
      requestLocation: "Mystery Location",
      recipientDistrict: "Nowhereland",
    });

    const res = await invoke(volunteer._id);

    expect(res.body.delivery.dropoff).toEqual({
      label: "Mystery Location",
      district: null,
      exact: false,
      latitude: null,
      longitude: null,
    });
  });

  it("answers with an empty payload for a volunteer without an active assignment", async () => {
    const volunteer = await makeUser({ role: "VOLUNTEER" });

    const res = await invoke(volunteer._id);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, assignment: null, delivery: null });
  });

  it("never returns another volunteer's assignment", async () => {
    await makeScenario({ assignmentStatus: "ACCEPTED" });
    const stranger = await makeUser({ role: "VOLUNTEER" });

    const res = await invoke(stranger._id);

    expect(res.body.assignment).toBeNull();
    expect(res.body.delivery).toBeNull();
  });
});
