// ONE-OFF: makes existing Assignment rows compatible with the "one active
// assignment" rules. It checks for conflicts first and changes nothing if any


const mongoose = require("mongoose");
try { require("dotenv").config(); } catch (_) { /* dotenv is optional */ }

const Assignment = require("../models/dilshara-Assignment");
const { ACTIVE_ASSIGNMENT_STATUSES } = require("../config/dilshara-matching.config");

// Use the same variable name as your server's database connection.
const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL;

async function findConflicts(field) {
  return Assignment.aggregate([
    { $match: { status: { $in: ACTIVE_ASSIGNMENT_STATUSES } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 }, assignmentIds: { $push: "$_id" } } },
    { $match: { count: { $gt: 1 } } },
  ]);
}

async function main() {
  if (!uri) throw new Error("No MongoDB connection string found in the environment.");

  await mongoose.connect(uri);
  console.log(`Connected to database: ${mongoose.connection.name}`);

  const [volunteerConflicts, donationConflicts] = await Promise.all([
    findConflicts("volunteerId"),
    findConflicts("donationId"),
  ]);

  if (volunteerConflicts.length || donationConflicts.length) {
    console.error("\nCannot enable the uniqueness rules: some active assignments conflict.");
    volunteerConflicts.forEach((c) =>
      console.error(`  Volunteer ${c._id} has ${c.count} active assignments: ${c.assignmentIds.join(", ")}`)
    );
    donationConflicts.forEach((c) =>
      console.error(`  Donation ${c._id} has ${c.count} active assignments: ${c.assignmentIds.join(", ")}`)
    );
    console.error("\nCancel or delete the extra rows (usually old test assignments), then run this again.");
    process.exitCode = 1;
    return;
  }

  const active = await Assignment.updateMany(
    { status: { $in: ACTIVE_ASSIGNMENT_STATUSES } },
    { $set: { isActive: true } }
  );
  const inactive = await Assignment.updateMany(
    { status: { $nin: ACTIVE_ASSIGNMENT_STATUSES } },
    { $set: { isActive: false } }
  );
  console.log(`Marked ${active.modifiedCount} active and ${inactive.modifiedCount} inactive assignment(s).`);

  await Assignment.createIndexes();
  const indexes = await Assignment.collection.indexes();
  console.log("Indexes:", indexes.map((index) => index.name).join(", "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());