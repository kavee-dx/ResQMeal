// DEVELOPMENT ONLY — seeds predictable data for the volunteer matching engine.
//
//   node src/scripts/dilshara-seedMatchingData.js --donor-email=you@example.com
//   node src/scripts/dilshara-seedMatchingData.js --donor-email=you@example.com --urgent
//   node src/scripts/dilshara-seedMatchingData.js --reset
//
// Connects with MONGO_URI, the same variable the server uses. Refuses to run
// in production. Safe to rerun; --reset deletes only records created here
// (accounts under seed-matching-*@resqmeal.test and the RM-SEED-MATCH-001
// donation), never ordinary users and never the database itself.


const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
try { require("dotenv").config(); } catch (_) { /* dotenv is optional */ }

const User = require("../models/dushani-User");
const VolunteerProfile = require("../models/dushani-VolunteerProfile");
const VolunteerAvailability = require("../models/dilshara-VolunteerAvailability");
const VolunteerDeliveryPreferences = require("../models/dilshara-VolunteerDeliveryPreferences");
const Donation = require("../models/kaveesha-Donation");
const FoodRequest = require("../models/dushani-foodRequestModel");
const Assignment = require("../models/dilshara-Assignment");
const { getDatePartsInColombo } = require("../utils/dilshara-time.util");

// Use the same variable name as your server's database connection (config/db.js).
const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_URL;

const SEED_EMAIL_PATTERN = /^seed-matching-.*@resqmeal\.test$/;
const SEED_DONATION_CODE = "RM-SEED-MATCH-001";
const MINUTE = 60 * 1000;
const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const args = process.argv.slice(2);
const RESET = args.includes("--reset");
const URGENT = args.includes("--urgent");
const donorEmailArg = (args.find((arg) => arg.startsWith("--donor-email=")) || "").split("=")[1];

const emailFor = (key) => `seed-matching-${key}@resqmeal.test`;
const hhmm = (date) => {
  const parts = getDatePartsInColombo(date);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
};

// One random, unknown password per run, hashed with the registration service's
// strategy (bcrypt, 10 rounds). These accounts exist for matching tests, never
// for login — nobody knows the plaintext.
let seedPasswordHash = null;

async function upsertUser(key, index, fields) {
  return User.findOneAndUpdate(
    { email: emailFor(key) },
    {
      $set: {
        email: emailFor(key),
        phoneNumber: `07999${String(index).padStart(5, "0")}`,
        isVerified: true,
        ...fields,
      },
      $setOnInsert: { password: seedPasswordHash },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
  );
}

async function reset() {
  const seedUsers = await User.find({ email: SEED_EMAIL_PATTERN }).select("_id").lean();
  const userIds = seedUsers.map((user) => user._id);
  const donations = await Donation.find({ donationCode: SEED_DONATION_CODE }).select("_id").lean();
  const donationIds = donations.map((donation) => donation._id);

  await Assignment.deleteMany({ $or: [{ volunteerId: { $in: userIds } }, { donationId: { $in: donationIds } }] });
  await FoodRequest.deleteMany({ $or: [{ recipient: { $in: userIds } }, { linkedDonation: { $in: donationIds } }] });
  await Donation.deleteMany({ _id: { $in: donationIds } });
  await Promise.all([
    VolunteerProfile.deleteMany({ userId: { $in: userIds } }),
    VolunteerAvailability.deleteMany({ userId: { $in: userIds } }),
    VolunteerDeliveryPreferences.deleteMany({ userId: { $in: userIds } }),
  ]);
  await User.deleteMany({ _id: { $in: userIds } });

  console.log(`Removed ${userIds.length} seeded user(s) and ${donationIds.length} seeded donation(s).`);
}

async function seed() {
  const now = new Date();
  // Whole-minute window starting in 30 minutes, lasting 2 hours.
  const windowStart = new Date(Math.floor((now.getTime() + 30 * MINUTE) / MINUTE) * MINUTE);
  const windowEnd = new Date(windowStart.getTime() + 120 * MINUTE);
  const halfPoint = new Date(windowStart.getTime() + 60 * MINUTE);

  if (getDatePartsInColombo(windowStart).date !== getDatePartsInColombo(windowEnd).date) {
    console.error("The seeded pickup window would cross midnight (Sri Lanka time). Run this earlier in the day.");
    process.exitCode = 1;
    return;
  }

  seedPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);

  // Clear old seeded assignments so reruns start clean.
  const oldSeedUsers = await User.find({ email: SEED_EMAIL_PATTERN }).select("_id").lean();
  const oldDonations = await Donation.find({ donationCode: SEED_DONATION_CODE }).select("_id").lean();
  await Assignment.deleteMany({
    $or: [
      { volunteerId: { $in: oldSeedUsers.map((u) => u._id) } },
      { donationId: { $in: oldDonations.map((d) => d._id) } },
    ],
  });

  // Donor: your own test donor (so you can log in and call the preview), or a seeded one.
  let donor;
  if (donorEmailArg) {
    donor = await User.findOne({ email: donorEmailArg.toLowerCase(), role: "DONOR" });
    if (!donor) throw new Error(`No DONOR account found with email ${donorEmailArg}.`);
  } else {
    donor = await upsertUser("donor", 1, {
      fullName: "Seed Donor", role: "DONOR", address: "12 Galle Road, Colombo", district: "Colombo", city: "Colombo",
    });
    console.log("Note: no --donor-email given, so the seeded donor cannot log in to call the preview endpoint.");
  }

  const recipient = await upsertUser("recipient", 2, {
    fullName: "Seed Recipient", role: "RECIPIENT", address: "Kaduwela", district: "Colombo", city: "Kaduwela",
  });

  const donation = await Donation.findOneAndUpdate(
    { donationCode: SEED_DONATION_CODE },
    {
      $set: {
        donor: donor._id,
        donationCode: SEED_DONATION_CODE,
        donationType: URGENT ? "URGENT" : "NORMAL",
        priority: URGENT ? "high" : "medium",
        status: "active",
        foodType: "Cooked rice",
        foodCategory: "Cooked meals",
        quantity: 20,
        quantityUnit: "kg",
        numberOfPortions: 40,
        preparationTime: new Date(now.getTime() - 60 * MINUTE),
        expiryTime: new Date(now.getTime() + 6 * 60 * MINUTE),
        availabilityStart: now,
        availabilityEnd: new Date(now.getTime() + 5 * 60 * MINUTE),
        pickupAddress: "12 Galle Road, Colombo",
        pickupDistrict: "Colombo",
        pickupWindowStart: windowStart,
        pickupWindowEnd: windowEnd,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
  );

  await FoodRequest.findOneAndUpdate(
    { linkedDonation: donation._id },
    {
      $set: {
        recipient: recipient._id,
        foodType: "Cooked rice",
        quantity: "20 packets",
        location: "Kaduwela, Colombo",
        urgency: URGENT ? "URGENT" : "NORMAL",
        priority: URGENT ? "HIGH" : "NORMAL",
        status: "MATCHED",
        acceptedBy: donor._id,
        acceptedAt: now,
        linkedDonation: donation._id,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
  );

  // Volunteers. Pickup is Colombo and the drop-off is in Colombo too.
  const volunteers = [
    { key: "a-best", district: "Colombo", area: "Colombo", max: 20, expect: "ELIGIBLE - 95.5 on a normal delivery" },
    { key: "b-nearby-area", district: "Colombo", area: "Gampaha", max: 20, expect: "ELIGIBLE - 83.0 (area is only nearby)" },
    { key: "c-half-window", district: "Colombo", area: "Colombo", max: 20, hours: ["00:00", hhmm(halfPoint)], expect: "ELIGIBLE - 85.5 (covers half the window)" },
    { key: "d-farther", district: "Gampaha", area: "Colombo, Gampaha", max: 40, expect: "ELIGIBLE - about 71.6 (about 24 km away)" },
    { key: "e-ties-with-a", district: "Colombo", area: "Colombo", max: 20, expect: "ELIGIBLE - ties with A (95.5); order decided by id" },
    { key: "f-too-far", district: "Kalutara", area: "Colombo", max: 10, expect: "REJECTED - ROUTE_EXCEEDS_MAX_DISTANCE" },
    { key: "g-unavailable", district: "Colombo", area: "Colombo", max: 20, availabilityStatus: "UNAVAILABLE", expect: "REJECTED - VOLUNTEER_UNAVAILABLE" },
    { key: "h-not-approved", district: "Colombo", area: "Colombo", max: 20, approvalStatus: "PENDING", expect: "REJECTED - VOLUNTEER_NOT_APPROVED" },
    { key: "i-restricted", district: "Colombo", area: "Colombo", max: 20, accountStatus: "restricted", expect: "REJECTED - ACCOUNT_NOT_ACTIVE" },
    { key: "j-busy", district: "Colombo", area: "Colombo", max: 20, assignment: "busy", expect: "REJECTED - ACTIVE_ASSIGNMENT_EXISTS" },
    { key: "k-declined-before", district: "Colombo", area: "Colombo", max: 20, assignment: "cancelled", expect: "REJECTED - PREVIOUSLY_CANCELLED_THIS_DELIVERY" },
    { key: "l-no-location", district: "Nowhere", area: "Colombo", max: 20, expect: "REJECTED - LOCATION_UNAVAILABLE" },
    { key: "m-exact-location", district: "Colombo", area: "Colombo", max: 20, location: [6.93, 79.86], expect: "ELIGIBLE - just under A (exact start, route still approximate)" },
  ];

  const report = [];

  for (const [index, spec] of volunteers.entries()) {
    const user = await upsertUser(spec.key, 10 + index, {
      fullName: `Seed Volunteer ${spec.key}`,
      role: "VOLUNTEER",
      address: `${spec.district} address`,
      district: spec.district,
      city: spec.district,
      accountStatus: spec.accountStatus || "active",
      approvalStatus: spec.approvalStatus || "APPROVED",
    });

    await VolunteerProfile.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          vehicleType: "MOTORBIKE",
          vehicleNumber: `SEED-${String(index + 1).padStart(4, "0")}`,
          preferredDeliveryArea: spec.area,
          preferredDeliveryTime: "Any time",
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
    );

    const [from, to] = spec.hours || ["00:00", "23:59"];
    await VolunteerAvailability.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          availabilityStatus: spec.availabilityStatus || "AVAILABLE",
          availableDays: ALL_DAYS,
          availableFrom: from,
          availableTo: to,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
    );

    await VolunteerDeliveryPreferences.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          userId: user._id,
          maxDeliveryDistance: spec.max,
          "location.latitude": spec.location ? spec.location[0] : null,
          "location.longitude": spec.location ? spec.location[1] : null,
          "location.updatedAt": spec.location ? now : null,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
    );

    if (spec.assignment === "busy") {
      // A job on some other donation.
      await Assignment.create({ donationId: new mongoose.Types.ObjectId(), volunteerId: user._id, status: "ASSIGNED" });
    }
    if (spec.assignment === "cancelled") {
      await Assignment.create({
        donationId: donation._id,
        volunteerId: user._id,
        status: "CANCELLED",
        cancelledBy: "VOLUNTEER",
        cancelledAt: now,
      });
    }

    report.push({ volunteer: spec.key, account: emailFor(spec.key), id: String(user._id), expected: spec.expect });
  }

  console.log("\nSeed data ready.");
  console.log(`Donation id: ${donation._id}${URGENT ? "  (URGENT delivery)" : ""}`);
  console.log(`Donor account:     ${donor.email} (id ${donor._id})`);
  console.log(`Recipient account: ${recipient.email} (id ${recipient._id})`);
  console.log(`Pickup window (Sri Lanka time): ${hhmm(windowStart)} - ${hhmm(windowEnd)}`);
  console.log("\nExpected outcome for each seeded volunteer:");
  console.table(report);
  console.log(`Preview:  GET /api/assignments/match-preview/${donation._id}  (log in as the donor who owns the donation)`);
  console.log("Remove everything it created:  node src/scripts/dilshara-seedMatchingData.js --reset");
}

async function main() {
  if (!uri) throw new Error("No MongoDB connection string found in the environment.");
  if (process.env.NODE_ENV === "production" || /prod/i.test(uri)) {
    throw new Error("Refusing to seed: this looks like a production environment.");
  }

  await mongoose.connect(uri);
  console.log(`Connected to database: ${mongoose.connection.name}`);

  if (RESET) await reset();
  else await seed();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());