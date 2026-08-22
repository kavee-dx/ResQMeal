jest.mock("../../src/utils/dushani-email", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
}));

const request = require("supertest");
const app = require("../../src/app"); // exported express app, no server.listen
const User = require("../../src/models/dushani-User");

// A verified individual donor used across the login tests below.
// Same shape as dushani-registration.test.js so it passes registration validation.
const verifiedDonor = {
  role: "DONOR",
  donorType: "INDIVIDUAL",
  fullName: "Kaveesha Login Test",
  email: "kaveesha.login@example.com",
  phoneNumber: "0779990000",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  address: "1 Test Lane",
  district: "Colombo",
  city: "Colombo",
};

// A donor that is registered but never verifies their email/OTP,
// used to test the "account not verified" login path.
const unverifiedDonor = {
  ...verifiedDonor,
  email: "kaveesha.unverified@example.com",
  phoneNumber: "0779990001",
};

/**
 * Registers a user via the real /api/auth/register endpoint, then
 * marks them verified directly in the DB (bypassing the email OTP step,
 * since we already have dedicated tests for verification elsewhere).
 */
async function registerAndVerify(payload) {
  await request(app).post("/api/auth/register").send(payload);
  await User.updateOne({ email: payload.email }, { isVerified: true });
}

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await registerAndVerify(verifiedDonor);
    await request(app).post("/api/auth/register").send(unverifiedDonor);
    // unverifiedDonor intentionally left with isVerified: false
  });

  afterEach(async () => {
    await User.deleteMany({
      email: { $in: [verifiedDonor.email, unverifiedDonor.email] },
    });
  });

  it("logs in successfully with correct email and password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: verifiedDonor.email,
      password: verifiedDonor.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe("DONOR");
    expect(res.body.user.email).toBe(verifiedDonor.email);
    // Password must never be echoed back in the response.
    expect(res.body.user.password).toBeUndefined();
  });

  it("rejects login with an incorrect password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: verifiedDonor.email,
      password: "WrongPassword123",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/incorrect email or password/i);
  });

  it("rejects login for an email that isn't registered", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "no.such.account@example.com",
      password: "SecurePass123",
    });

    // Deliberately the same status/message as "wrong password" above,
    // so the API never reveals whether an email is registered.
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/incorrect email or password/i);
  });

  it("rejects login when the account has not been verified yet", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: unverifiedDonor.email,
      password: unverifiedDonor.password,
    });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not verified/i);
  });

  it("rejects login when email is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({
      password: "SecurePass123",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email and password/i);
  });

  it("rejects login when password is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: verifiedDonor.email,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email and password/i);
  });
});

describe("GET /api/auth/me", () => {
  afterEach(async () => {
    await User.deleteMany({ email: verifiedDonor.email });
  });

  it("returns the current user when a valid token is provided", async () => {
    await registerAndVerify(verifiedDonor);

    const loginRes = await request(app).post("/api/auth/login").send({
      email: verifiedDonor.email,
      password: verifiedDonor.password,
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(verifiedDonor.email);
  });

  it("rejects the request when no token is provided", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});