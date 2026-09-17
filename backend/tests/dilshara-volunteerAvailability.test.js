const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const jwt = require("jsonwebtoken");

const app = require("../src/app");
const VolunteerAvailability = require("../src/models/dilshara-VolunteerAvailability");

let mongoServer;

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

function makeToken(userId, role = "VOLUNTEER") {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: "1h" });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await VolunteerAvailability.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("GET /api/volunteer-profile/availability", () => {
  it("returns defaults when no record exists", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = makeToken(userId);

    const res = await request(app)
      .get("/api/volunteer-profile/availability")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.availabilityStatus).toBe("UNAVAILABLE");
    expect(res.body.availableDays).toEqual([]);
  });

  it("rejects a non-volunteer role", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = makeToken(userId, "DONOR");

    const res = await request(app)
      .get("/api/volunteer-profile/availability")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/volunteer-profile/availability");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/volunteer-profile/availability", () => {
  it("upserts a valid payload and returns it", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = makeToken(userId);

    const payload = {
      availabilityStatus: "AVAILABLE",
      availableDays: ["MON", "WED", "FRI"],
      availableFrom: "16:00",
      availableTo: "22:00",
    };

    const res = await request(app)
      .patch("/api/volunteer-profile/availability")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.availability.availableDays).toEqual(["MON", "WED", "FRI"]);

    const getRes = await request(app)
      .get("/api/volunteer-profile/availability")
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.body.availabilityStatus).toBe("AVAILABLE");
  });

  it("rejects AVAILABLE with zero days selected", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = makeToken(userId);

    const res = await request(app)
      .patch("/api/volunteer-profile/availability")
      .set("Authorization", `Bearer ${token}`)
      .send({
        availabilityStatus: "AVAILABLE",
        availableDays: [],
        availableFrom: "16:00",
        availableTo: "22:00",
      });

    expect(res.status).toBe(400);
  });

  it("rejects an invalid time format", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = makeToken(userId);

    const res = await request(app)
      .patch("/api/volunteer-profile/availability")
      .set("Authorization", `Bearer ${token}`)
      .send({
        availabilityStatus: "AVAILABLE",
        availableDays: ["MON"],
        availableFrom: "4pm",
        availableTo: "22:00",
      });

    expect(res.status).toBe(400);
  });

  it("rejects when availableFrom is not before availableTo", async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = makeToken(userId);

    const res = await request(app)
      .patch("/api/volunteer-profile/availability")
      .set("Authorization", `Bearer ${token}`)
      .send({
        availabilityStatus: "AVAILABLE",
        availableDays: ["MON"],
        availableFrom: "22:00",
        availableTo: "16:00",
      });

    expect(res.status).toBe(400);
  });
});
