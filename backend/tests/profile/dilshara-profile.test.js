// backend/tests/profile/dilshara-profile.test.js
// RESQ-71 / RESQ-72 — Test Profile Retrieval, Update, and Account Status
// Owner: Dilshara
// Git commit: test(profile): add profile get/update and account status test cases
//
// Uses Jest + Supertest against the Express app (mongodb-memory-server recommended
// for isolated test runs — swap out the mongoUri in setup if you wire that in).

const request = require("supertest");
const app = require("../../src/app"); // export the express app (no server.listen) for testing
const User = require("../../src/models/dushani-User");

const individualDonor = {
  role: "DONOR",
  donorType: "INDIVIDUAL",
  fullName: "Profile Test Donor",
  email: "profile.donor@example.com",
  phoneNumber: "0771230001",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  address: "10 River Road",
  district: "Colombo",
  city: "Colombo",
};

const individualRecipient = {
  role: "RECIPIENT",
  recipientType: "INDIVIDUAL",
  fullName: "Profile Test Recipient",
  email: "profile.recipient@example.com",
  phoneNumber: "0771230002",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  address: "20 Lake Road",
  district: "Galle",
  city: "Galle",
  peopleNeedingFood: 3,
  foodRequirements: ["RICE"],
};

// Registers a user via the real auth flow and returns their _id,
// mirroring how Dushani's registration tests create test users.
async function registerAndGetId(payload) {
  const res = await request(app).post("/api/auth/register").send(payload);
  return res.body.user.id || res.body.user._id;
}

describe("GET /api/profile", () => {
  let donorId;

  beforeEach(async () => {
    donorId = await registerAndGetId(individualDonor);
  });

  afterEach(async () => {
    await User.deleteMany({ email: individualDonor.email });
  });

  it("rejects the request when x-user-id header is missing", async () => {
    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/x-user-id/i);
  });

  it("returns 404 for a user id that does not exist", async () => {
    const res = await request(app)
      .get("/api/profile")
      .set("x-user-id", "64b7f0f0f0f0f0f0f0f0f0f0");
    expect(res.status).toBe(404);
  });

  it("returns the merged profile for a valid donor", async () => {
    const res = await request(app).get("/api/profile").set("x-user-id", donorId);
    expect(res.status).toBe(200);
    expect(res.body.profile.role).toBe("DONOR");
    expect(res.body.profile.donorType).toBe("INDIVIDUAL");
    expect(res.body.profile.fullName).toBe(individualDonor.fullName);
  });

  it("defaults accountStatus to 'active' for a newly registered user", async () => {
    const res = await request(app).get("/api/profile").set("x-user-id", donorId);
    expect(res.status).toBe(200);
    expect(res.body.profile.accountStatus).toBe("active");
  });
});

describe("PATCH /api/profile", () => {
  let recipientId;

  beforeEach(async () => {
    recipientId = await registerAndGetId(individualRecipient);
  });

  afterEach(async () => {
    await User.deleteMany({ email: individualRecipient.email });
  });

  it("updates a shared User field (address)", async () => {
    const res = await request(app)
      .patch("/api/profile")
      .set("x-user-id", recipientId)
      .send({ address: "99 New Street" });

    expect(res.status).toBe(200);
    expect(res.body.profile.address).toBe("99 New Street");
  });

  it("updates a role-specific field (peopleNeedingFood)", async () => {
    const res = await request(app)
      .patch("/api/profile")
      .set("x-user-id", recipientId)
      .send({ peopleNeedingFood: 8 });

    expect(res.status).toBe(200);
    expect(res.body.profile.peopleNeedingFood).toBe(8);
  });

  it("rejects an update when x-user-id header is missing", async () => {
    const res = await request(app).patch("/api/profile").send({ address: "Nope" });
    expect(res.status).toBe(401);
  });
});