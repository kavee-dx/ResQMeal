// Finds an eligible volunteer for a donation and creates the Assignment.
// Owner: Dilshara

const Assignment = require("../models/dilshara-Assignment");
const VolunteerAvailability = require("../models/dilshara-VolunteerAvailability");
const { isVolunteerEligibleNow } = require("./dilshara-allocationEligibility.service");

async function findAndAssignVolunteer(donationId) {
  // Pull every volunteer currently marked AVAILABLE — narrows the pool
  // before running the more detailed per-volunteer check.
  const candidates = await VolunteerAvailability.find({ availabilityStatus: "AVAILABLE" });

  for (const candidate of candidates) {
    const { eligible } = await isVolunteerEligibleNow(candidate.userId, "IDLE");
    if (eligible) {
      const assignment = await Assignment.create({
        donationId,
        volunteerId: candidate.userId,
        status: "ASSIGNED",
      });
      return assignment;
    }
  }

  return null; // no eligible volunteer right now
}

module.exports = { findAndAssignVolunteer };