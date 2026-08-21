jest.mock("../../src/utils/kaveesha-resendMailer", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

const request = require("supertest");
const app = require("../../src/app");
const User = require("../../src/models/dushani-User");
const {
  sendPasswordResetEmail,
} = require("../../src/utils/kaveesha-resendMailer");

const donor = {
  role: "DONOR",
  donorType: "INDIVIDUAL",
  fullName: "Kaveesha Reset Test",
  email: "kaveesha.reset@example.com",
  phoneNumber: "0779990002",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  address: "1 Reset Lane",
  district: "Colombo",
  city: "Colombo",
};

async function registerAndVerify(payload) {
  await request(app).post("/api/auth/register").send(payload);
  await User.updateOne({ email: payload.email }, { isVerified: true });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await registerAndVerify(donor);
});

afterEach(async () => {
  await User.deleteMany({ email: donor.email });
});

describe("POST /api/auth/forgot-password", () => {
  it("sends a reset code when the email exists", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: donor.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: donor.email }),
    );

    const updated = await User.findOne({ email: donor.email }).select(
      "+resetPasswordCode +resetPasswordExpires",
    );
    expect(updated.resetPasswordCode).toBeDefined();
    expect(updated.resetPasswordExpires).toBeDefined();
  });

  it("responds with success even when the email doesn't exist (no leaking)", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // No user to email, so the mailer must not have been called.
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("rejects the request when email is missing", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/verify-reset-otp", () => {
  async function requestCode() {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: donor.email });

    const user = await User.findOne({ email: donor.email }).select(
      "+resetPasswordCode",
    );
    return user.resetPasswordCode;
  }

  it("issues a resetToken for a correct, unexpired code", async () => {
    const code = await requestCode();

    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: donor.email, code });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.resetToken).toBeDefined();
  });

  it("rejects an incorrect code", async () => {
    await requestCode();

    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: donor.email, code: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });

  it("rejects a code that has expired", async () => {
    const code = await requestCode();

    // Force the stored expiry into the past to simulate an expired code.
    await User.updateOne(
      { email: donor.email },
      { resetPasswordExpires: new Date(Date.now() - 60 * 1000) },
    );

    const res = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: donor.email, code });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid or has expired/i);
  });
});

describe("POST /api/auth/reset-password", () => {
  async function getValidResetToken() {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: donor.email });

    const user = await User.findOne({ email: donor.email }).select(
      "+resetPasswordCode",
    );

    const verifyRes = await request(app)
      .post("/api/auth/verify-reset-otp")
      .send({ email: donor.email, code: user.resetPasswordCode });

    return verifyRes.body.resetToken;
  }

  it("resets the password with a valid token and strong new password", async () => {
    const resetToken = await getValidResetToken();

    const res = await request(app).post("/api/auth/reset-password").send({
      resetToken,
      newPassword: "NewSecurePass456",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm the new password actually works for login.
    const loginRes = await request(app).post("/api/auth/login").send({
      email: donor.email,
      password: "NewSecurePass456",
    });
    expect(loginRes.status).toBe(200);

    // And the old password no longer works.
    const oldLoginRes = await request(app).post("/api/auth/login").send({
      email: donor.email,
      password: donor.password,
    });
    expect(oldLoginRes.status).toBe(401);
  });

  it("rejects a weak new password", async () => {
    const resetToken = await getValidResetToken();

    const res = await request(app).post("/api/auth/reset-password").send({
      resetToken,
      newPassword: "weak",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 8 characters/i);
  });

  it("rejects an invalid or tampered reset token", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({
      resetToken: "not-a-real-token",
      newPassword: "NewSecurePass456",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired|invalid/i);
  });

  it("rejects when resetToken or newPassword is missing", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ newPassword: "NewSecurePass456" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/missing/i);
  });
});