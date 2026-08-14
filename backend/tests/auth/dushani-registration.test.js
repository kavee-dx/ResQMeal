// backend/tests/auth/dushani-registration.test.js
// Task 26 — Test Registration and Verification Flow
// Owner: Dushani
// Git commit: test(auth): add registration and verification test cases
//
// Uses Jest + Supertest against the Express app (mongodb-memory-server recommended
// for isolated test runs — swap out the mongoUri in setup if you wire that in).

const request = require("supertest");
const app = require("../../src/app"); // export the express app (no server.listen) for testing
const User = require("../../src/models/dushani-User");

const individualDonor = {
  role: "DONOR",
  donorType: "INDIVIDUAL",
  fullName: "Dushani Naveendhya",
  email: "dushani.donor@example.com",
  phoneNumber: "0771234567",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  address: "12 Lake Road",
  district: "Colombo",
  city: "Colombo",
};

const businessDonor = {
  role: "DONOR",
  donorType: "RESTAURANT",
  businessName: "ABC Restaurant",
  authorizedPerson: "Kamal Perera",
  position: "Manager",
  businessRegistrationNumber: "BR-123456",
  businessContactNumber: "0771112222",
  phoneNumber: "0771112223",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  address: "123 Galle Road",
  district: "Colombo",
  city: "Colombo",
};

const individualRecipient = {
  role: "RECIPIENT",
  recipientType: "INDIVIDUAL",
  fullName: "Recipient Test",
  email: "recipient.test@example.com",
  phoneNumber: "0772223333",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  address: "5 Temple Road",
  district: "Galle",
  city: "Galle",
  peopleNeedingFood: 4,
  foodRequirements: ["RICE", "VEGETABLES"],
};

const organizationRecipient = {
  role: "RECIPIENT",
  recipientType: "COMMUNITY_CENTER",
  organizationName: "Hope Community Center",
  organizationRegistrationNumber: "ORG-9988",
  authorizedPerson: "Nimal Silva",
  position: "Coordinator",
  phoneNumber: "0773334444",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  address: "8 Main Street",
  district: "Kandy",
  city: "Kandy",
  peopleNeedingFood: 100,
  foodRequirements: ["RICE", "MEAL_PACKETS"],
  // email intentionally omitted — optional for organization recipients
};

const ngo = {
  role: "NGO",
  organizationName: "Relief Trust",
  ngoRegistrationNumber: "NGO-5566",
  organizationType: "RELIEF_ORGANIZATION",
  authorizedPerson: "Sanduni Fernando",
  position: "Director",
  email: "contact@relieftrust.org",
  phoneNumber: "0774445555",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  address: "22 Park Avenue",
  district: "Colombo",
  city: "Colombo",
};

const volunteerWalking = {
  role: "VOLUNTEER",
  fullName: "Verify Test",
  email: "verify.test@example.com",
  phoneNumber: "0779998888",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  address: "45 Hill Street",
  district: "Kandy",
  city: "Kandy",
  vehicleType: "WALKING",
  preferredDeliveryArea: "Kandy Town",
  availability: "AVAILABLE",
};

const volunteerMotorbike = {
  ...volunteerWalking,
  email: "volunteer.bike@example.com",
  phoneNumber: "0775556666",
  vehicleType: "MOTORBIKE",
  // vehicleNumber intentionally omitted to test the conditional requirement
};

describe("POST /api/auth/register — DONOR", () => {
  afterEach(async () => {
    await User.deleteMany({ email: { $in: [individualDonor.email] } });
    await User.deleteMany({ phoneNumber: businessDonor.phoneNumber });
  });

  it("registers an individual donor", async () => {
    const res = await request(app).post("/api/auth/register").send(individualDonor);
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("DONOR");
  });

  it("registers a business donor (Restaurant)", async () => {
    const res = await request(app).post("/api/auth/register").send(businessDonor);
    expect(res.status).toBe(201);
  });

  it("rejects business donor missing businessRegistrationNumber", async () => {
    const { businessRegistrationNumber, ...incomplete } = businessDonor;
    const res = await request(app).post("/api/auth/register").send(incomplete);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === "businessRegistrationNumber")).toBe(true);
  });

  it("rejects donorType OTHER without specifiedDonorType", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...businessDonor, phoneNumber: "0771119999", donorType: "OTHER" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/specify your donor type/i);
  });
});

describe("POST /api/auth/register — RECIPIENT", () => {
  afterEach(async () => {
    await User.deleteMany({ email: individualRecipient.email });
    await User.deleteMany({ phoneNumber: organizationRecipient.phoneNumber });
  });

  it("registers an individual recipient with food requirements", async () => {
    const res = await request(app).post("/api/auth/register").send(individualRecipient);
    expect(res.status).toBe(201);
  });

  it("registers an organization recipient without email (optional)", async () => {
    const res = await request(app).post("/api/auth/register").send(organizationRecipient);
    expect(res.status).toBe(201);
  });

  it("rejects recipient with no food requirements selected", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...individualRecipient, foodRequirements: [] });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === "foodRequirements")).toBe(true);
  });
});

describe("POST /api/auth/register — NGO", () => {
  afterEach(async () => {
    await User.deleteMany({ email: ngo.email });
  });

  it("registers an NGO account", async () => {
    const res = await request(app).post("/api/auth/register").send(ngo);
    expect(res.status).toBe(201);
  });
});

describe("POST /api/auth/register — VOLUNTEER", () => {
  afterEach(async () => {
    await User.deleteMany({ email: { $in: [volunteerWalking.email, volunteerMotorbike.email] } });
  });

  it("registers a walking volunteer without a vehicle number", async () => {
    const res = await request(app).post("/api/auth/register").send(volunteerWalking);
    expect(res.status).toBe(201);
  });

  it("rejects a motorbike volunteer missing vehicle number", async () => {
    const res = await request(app).post("/api/auth/register").send(volunteerMotorbike);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/vehicle number/i);
  });
});

describe("POST /api/auth/register — shared validation", () => {
  it("rejects registration when passwords do not match", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...individualDonor, confirmPassword: "Different123" });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate email registration", async () => {
    await request(app).post("/api/auth/register").send(individualDonor);
    const res = await request(app).post("/api/auth/register").send(individualDonor);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
    await User.deleteMany({ email: individualDonor.email });
  });
});

describe("POST /api/auth/verify", () => {
  const email = volunteerWalking.email;

  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(volunteerWalking);
  });

  afterEach(async () => {
    await User.deleteMany({ email });
  });

  it("rejects verification with an incorrect code", async () => {
    const res = await request(app).post("/api/auth/verify").send({ email, code: "000000" });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/incorrect/i);
  });

  it("verifies successfully with the correct code", async () => {
    const user = await User.findOne({ email }).select("+verificationCode");
    const res = await request(app)
      .post("/api/auth/verify")
      .send({ email, code: user.verificationCode });

    expect(res.status).toBe(200);
    expect(res.body.user.isVerified).toBe(true);
  });

  it("rejects a second verification attempt once already verified", async () => {
    const user = await User.findOne({ email }).select("+verificationCode");
    await request(app).post("/api/auth/verify").send({ email, code: user.verificationCode });

    const res = await request(app)
      .post("/api/auth/verify")
      .send({ email, code: user.verificationCode });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already verified/i);
  });
});
