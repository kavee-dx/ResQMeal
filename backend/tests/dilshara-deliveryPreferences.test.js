// Step 14 — the pipeline between the volunteer preferences UI and the
// matching engine. What the app saves through the real routes must be
// exactly what the candidate loader hands to eligibility and scoring,
// and invalid payloads must fail with 4xx codes, not 500s.
// JWT_SECRET must be set before the app (and kaveesha-jwt) is required.
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = require("../src/app");
const User = require("../src/models/dushani-User");
const VolunteerProfile = require("../src/models/dushani-VolunteerProfile");
const VolunteerAvailability = require("../src/models/dilshara-VolunteerAvailability");
const VolunteerDeliveryPreferences = require("../src/models/dilshara-VolunteerDeliveryPreferences");
const { loadVolunteerCandidates } = require("../src/services/dilshara-volunteerCandidate.service");

const JWT_SECRET = process.env.JWT_SECRET;

let counter = 0;

async function makeUser(role = "VOLUNTEER") {
  const n = ++counter;
  return User.create({
    fullName: `Step14 ${role} ${n}`,
    email: `step14-${role.toLowerCase()}-${n}@resqmeal.test`,
    phoneNumber: `0774${String(n).padStart(6, "0")}`,
    password: "not-used-in-tests",
    role,
    address: "Colombo test address",
    district: "Colombo",
    city: "Colombo",
  });
}

function makeToken(user, role = "VOLUNTEER") {
  return jwt.sign({ id: String(user._id), role }, JWT_SECRET, { expiresIn: "1h" });
}

const auth = (user, role) => ["Authorization", `Bearer ${makeToken(user, role)}`];
const availabilityUrl = "/api/volunteer-profile/availability";
const preferencesUrl = "/api/volunteer-profile/delivery-preferences";

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    VolunteerProfile.deleteMany({}),
    VolunteerAvailability.deleteMany({}),
    VolunteerDeliveryPreferences.deleteMany({}),
  ]);
});

describe("availability and preferences: app saves -> engine reads (step 14)", () => {
  it("persists AVAILABLE status and days saved by the app, and the candidate loader reads them", async () => {
    const volunteer = await makeUser();

    const patchRes = await request(app)
      .patch(availabilityUrl)
      .set(...auth(volunteer))
      .send({
        availabilityStatus: "AVAILABLE",
        availableDays: ["MON", "WED"],
        availableFrom: "17:00",
        availableTo: "21:30",
      });

    expect(patchRes.status).toBe(200);

    const getRes = await request(app).get(availabilityUrl).set(...auth(volunteer));
    expect(getRes.status).toBe(200);
    expect(getRes.body.availabilityStatus).toBe("AVAILABLE");
    expect(getRes.body.availableDays).toEqual(["MON", "WED"]);
    expect(getRes.body.availableFrom).toBe("17:00");
    expect(getRes.body.availableTo).toBe("21:30");

    const candidates = await loadVolunteerCandidates(new mongoose.Types.ObjectId());
    const candidate = candidates.find((row) => row.userId === String(volunteer._id));

    expect(candidate).toBeTruthy();
    expect(candidate.availability.availabilityStatus).toBe("AVAILABLE");
    expect(candidate.availability.availableDays).toEqual(["MON", "WED"]);
    expect(candidate.availability.availableFrom).toBe("17:00");
    expect(candidate.availability.availableTo).toBe("21:30");
  });

  it("persists UNAVAILABLE so the engine sees the volunteer as unavailable", async () => {
    const volunteer = await makeUser();

    const patchRes = await request(app)
      .patch(availabilityUrl)
      .set(...auth(volunteer))
      .send({
        availabilityStatus: "UNAVAILABLE",
        availableDays: [],
        availableFrom: "16:00",
        availableTo: "22:00",
      });

    expect(patchRes.status).toBe(200);

    const candidates = await loadVolunteerCandidates(new mongoose.Types.ObjectId());
    const candidate = candidates.find((row) => row.userId === String(volunteer._id));

    expect(candidate.availability.availabilityStatus).toBe("UNAVAILABLE");
  });

  it("persists area, distance and coordinates, and the candidate loader reads the same values", async () => {
    const volunteer = await makeUser();
    await VolunteerProfile.create({
      userId: volunteer._id,
      vehicleType: "BICYCLE",
      preferredDeliveryArea: "Colombo",
    });

    const patchRes = await request(app)
      .patch(preferencesUrl)
      .set(...auth(volunteer))
      .send({
        preferredDeliveryArea: "Malabe, Kaduwela",
        preferredDeliveryTime: "17:00 - 21:30",
        maxDeliveryDistance: 5,
        location: { latitude: 6.9271, longitude: 79.8612 },
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.preferences.maxDeliveryDistance).toBe(5);

    const getRes = await request(app).get(preferencesUrl).set(...auth(volunteer));
    expect(getRes.status).toBe(200);
    expect(getRes.body.preferredDeliveryArea).toBe("Malabe, Kaduwela");
    expect(getRes.body.preferredDeliveryTime).toBe("17:00 - 21:30");
    expect(getRes.body.maxDeliveryDistance).toBe(5);
    expect(getRes.body.location).toEqual({ latitude: 6.9271, longitude: 79.8612 });

    const candidates = await loadVolunteerCandidates(new mongoose.Types.ObjectId());
    const candidate = candidates.find((row) => row.userId === String(volunteer._id));

    expect(candidate.profile.preferredDeliveryArea).toBe("Malabe, Kaduwela");
    expect(candidate.preferences.maxDeliveryDistance).toBe(5);
    expect(candidate.preferences.location.latitude).toBe(6.9271);
    expect(candidate.preferences.location.longitude).toBe(79.8612);
  });

  it("rejects a distance below the 0.1 km floor with 400 instead of a 500", async () => {
    const volunteer = await makeUser();
    await VolunteerProfile.create({
      userId: volunteer._id,
      vehicleType: "WALKING",
      preferredDeliveryArea: "Colombo",
    });

    const res = await request(app)
      .patch(preferencesUrl)
      .set(...auth(volunteer))
      .send({ preferredDeliveryArea: "Colombo", maxDeliveryDistance: 0.05 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("at least 0.1");

    const boundary = await request(app)
      .patch(preferencesUrl)
      .set(...auth(volunteer))
      .send({ preferredDeliveryArea: "Colombo", maxDeliveryDistance: 0.1 });

    expect(boundary.status).toBe(200);
  });

  it("handles a volunteer with a profile but no preference records safely", async () => {
    const volunteer = await makeUser();
    await VolunteerProfile.create({
      userId: volunteer._id,
      vehicleType: "BICYCLE",
      preferredDeliveryArea: "Kandy",
    });

    const getRes = await request(app).get(preferencesUrl).set(...auth(volunteer));
    expect(getRes.status).toBe(200);
    expect(getRes.body.preferredDeliveryArea).toBe("Kandy");
    expect(getRes.body.maxDeliveryDistance).toBeNull();
    expect(getRes.body.location).toEqual({ latitude: null, longitude: null });

    const candidates = await loadVolunteerCandidates(new mongoose.Types.ObjectId());
    const candidate = candidates.find((row) => row.userId === String(volunteer._id));
    expect(candidate.preferences).toBeNull();
  });

  it("persists preferences and exposes the saved area to matching without a volunteer profile", async () => {
    const volunteer = await makeUser();

    const res = await request(app)
      .patch(preferencesUrl)
      .set(...auth(volunteer))
      .send({
        preferredDeliveryArea: "Colombo",
        preferredDeliveryTime: "16:00 - 22:00",
        maxDeliveryDistance: 5,
      });

    expect(res.status).toBe(200);

    const stored = await VolunteerDeliveryPreferences.findOne({ userId: volunteer._id }).lean();
    expect(stored.preferredDeliveryArea).toBe("Colombo");
    expect(stored.preferredDeliveryTime).toBe("16:00 - 22:00");
    expect(stored.maxDeliveryDistance).toBe(5);

    const getRes = await request(app).get(preferencesUrl).set(...auth(volunteer));
    expect(getRes.status).toBe(200);
    expect(getRes.body.preferredDeliveryArea).toBe("Colombo");
    expect(getRes.body.preferredDeliveryTime).toBe("16:00 - 22:00");

    const candidates = await loadVolunteerCandidates(new mongoose.Types.ObjectId());
    const candidate = candidates.find((row) => row.userId === String(volunteer._id));
    expect(candidate.profile).toBeNull();
    expect(candidate.preferences.preferredDeliveryArea).toBe("Colombo");
  });

  it("only allows authenticated volunteers to read or change these records", async () => {
    const volunteer = await makeUser();
    const donor = await makeUser("DONOR");

    const noToken = await request(app).get(availabilityUrl);
    expect(noToken.status).toBe(401);

    const asDonor = await request(app).get(preferencesUrl).set(...auth(donor, "DONOR"));
    expect(asDonor.status).toBe(403);

    const donorPatch = await request(app)
      .patch(availabilityUrl)
      .set(...auth(donor, "DONOR"))
      .send({
        availabilityStatus: "AVAILABLE",
        availableDays: ["MON"],
        availableFrom: "16:00",
        availableTo: "22:00",
      });
    expect(donorPatch.status).toBe(403);

    // The donor's attempt must not have created a record for anyone.
    const stored = await VolunteerAvailability.countDocuments({});
    expect(stored).toBe(0);
  });
});
