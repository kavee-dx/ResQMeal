// The matching engine's entry points.
//
//   rankVolunteersForDelivery  - preview: ranked + rejected, creates nothing
//   assignVolunteerForDelivery - ranks, then safely creates the Assignment
//   findAndAssignVolunteer     - Assignment or null (used after a volunteer declines)
//
// Eligibility (hard rules) is separate from scoring; only eligible volunteers
// are scored. Rules + weighted scoring, not a trained ML model.
// Owner: Dilshara

const Assignment = require("../models/dilshara-Assignment");
const { ACTIVE_ASSIGNMENT_STATUSES } = require("../config/dilshara-matching.config");
const { buildDeliveryContext } = require("./dilshara-deliveryContext.service");
const { loadVolunteerCandidates } = require("./dilshara-volunteerCandidate.service");
const { evaluateCandidate } = require("./dilshara-allocationEligibility.service");
const { scoreCandidate, compareRanked } = require("./dilshara-volunteerScoring.service");
const { notify } = require("./amasha-notificationService");

// Ranks every volunteer for a delivery. Creates nothing and sends nothing.
// Returns { ok: true, context, ranked, rejected } or { ok: false, code, message }.
async function rankVolunteersForDelivery(donationId, { now = new Date() } = {}) {
  const built = await buildDeliveryContext(donationId, { now });
  if (!built.ok) return built;

  const { context } = built;
  const candidates = await loadVolunteerCandidates(context.donationId);

  const ranked = [];
  const rejected = [];

  for (const candidate of candidates) {
    const evaluation = evaluateCandidate(candidate, context);
    if (!evaluation.eligible) {
      rejected.push({ userId: candidate.userId, reasons: evaluation.reasons });
      continue; // never scored
    }
    ranked.push(scoreCandidate(candidate, context, evaluation));
  }

  ranked.sort(compareRanked);
  ranked.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return { ok: true, context, ranked, rejected };
}

const isDuplicateKeyError = (error) => Boolean(error) && error.code === 11000;

// Did the duplicate come from the "one active assignment per donation" rule?
function isDonationConflict(error) {
  const pattern = error.keyPattern || {};
  return (
    Object.prototype.hasOwnProperty.call(pattern, "donationId") ||
    /one_active_assignment_per_donation/.test(error.message || "")
  );
}

async function loadActiveAssignmentForDonation(donationId) {
  return Assignment.findOne({ donationId, status: { $in: ACTIVE_ASSIGNMENT_STATUSES } });
}

// The assignment is already saved. A notification problem must never undo it.
async function sendOfferNotification(assignment, context) {
  try {
    await notify("ASSIGNMENT_OFFERED", [assignment.volunteerId], {
      assignmentId: assignment._id,
      volunteerId: assignment.volunteerId,
      donationId: context.donationId,
      requestId: context.requestId,
      foodType: context.foodType,
      pickupAddress: context.pickupAddress,
    });
  } catch (error) {
    console.error("Could not send the assignment offer notification:", error);
  }
}

// Ranks, then assigns the best volunteer. Never throws for a normal "no".
// Returns { status: "ASSIGNED", assignment }
//      or { status: "ALREADY_ASSIGNED", assignmentId? }
//      or { status: "NO_ELIGIBLE_VOLUNTEER" }
//      or { status: "INVALID_DELIVERY", code, message }
async function assignVolunteerForDelivery(donationId, options = {}) {
  const result = await rankVolunteersForDelivery(donationId, options);

  if (!result.ok) {
    if (result.code === "ALREADY_ASSIGNED") {
      return { status: "ALREADY_ASSIGNED", assignmentId: result.assignmentId };
    }
    return { status: "INVALID_DELIVERY", code: result.code, message: result.message };
  }

  for (const entry of result.ranked) {
    let assignment;
    try {
      assignment = await Assignment.create({
        donationId: result.context.donationId,
        requestId: result.context.requestId,
        volunteerId: entry.userId,
        status: "ASSIGNED",
        matchScore: entry.score,
        matchBreakdown: entry.breakdown,
        matchReasons: entry.reasons,
        routeDistanceKm: entry.routeDistanceKm,
        locationPrecision: entry.locationPrecision,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;

      // Someone else assigned this donation while we were ranking: stop and
      // return their assignment, so the caller can still find it.
      if (isDonationConflict(error)) {
        const existing = await loadActiveAssignmentForDonation(result.context.donationId);
        return {
          status: "ALREADY_ASSIGNED",
          assignmentId: existing ? String(existing._id) : undefined,
        };
      }

      // This volunteer just got another job: try the next best candidate.
      continue;
    }

    await sendOfferNotification(assignment, result.context);
    return { status: "ASSIGNED", assignment };
  }

  // Nobody was assignable. Unless a concurrent attempt already assigned this
  // same donation while we were ranking (its create committed first), the
  // request simply has no volunteer that fits right now.
  const existing = await loadActiveAssignmentForDonation(result.context.donationId);
  if (existing) {
    return { status: "ALREADY_ASSIGNED", assignmentId: String(existing._id) };
  }
  return { status: "NO_ELIGIBLE_VOLUNTEER" };
}

// Re-rank when committing a donor's choice so a stale preview cannot bypass
// current eligibility or assignment conflicts.
async function assignSuggestedVolunteerForDelivery(donationId, volunteerId, options = {}) {
  const result = await rankVolunteersForDelivery(donationId, options);
  if (!result.ok) {
    if (result.code === "ALREADY_ASSIGNED") {
      return { status: "ALREADY_ASSIGNED", assignmentId: result.assignmentId };
    }
    return { status: "INVALID_DELIVERY", code: result.code, message: result.message };
  }

  const selected = result.ranked.find((entry) => String(entry.userId) === String(volunteerId));
  if (!selected) return { status: "VOLUNTEER_NOT_ELIGIBLE" };

  try {
    const assignment = await Assignment.create({
      donationId: result.context.donationId,
      requestId: result.context.requestId,
      volunteerId: selected.userId,
      status: "ASSIGNED",
      matchScore: selected.score,
      matchBreakdown: selected.breakdown,
      matchReasons: selected.reasons,
      routeDistanceKm: selected.routeDistanceKm,
      locationPrecision: selected.locationPrecision,
    });

    await sendOfferNotification(assignment, result.context);
    return { status: "ASSIGNED", assignment };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    if (isDonationConflict(error)) {
      const existing = await loadActiveAssignmentForDonation(result.context.donationId);
      return {
        status: "ALREADY_ASSIGNED",
        assignmentId: existing ? String(existing._id) : undefined,
      };
    }
    return { status: "VOLUNTEER_BUSY" };
  }
}

// The simple call for follow-up matching after an assigned volunteer declines.
// Returns the Assignment (new, or the existing active one), or null when no
// volunteer can be assigned right now.
async function findAndAssignVolunteer(donationId, options = {}) {
  const outcome = await assignVolunteerForDelivery(donationId, options);

  if (outcome.status === "ASSIGNED") return outcome.assignment;

  if (outcome.status === "ALREADY_ASSIGNED") {
    return outcome.assignmentId
      ? Assignment.findById(outcome.assignmentId)
      : loadActiveAssignmentForDonation(donationId);
  }

  if (outcome.status === "INVALID_DELIVERY") {
    console.warn(`Volunteer matching skipped (${outcome.code}): ${outcome.message}`);
  }
  return null;
}

module.exports = {
  rankVolunteersForDelivery,
  assignVolunteerForDelivery,
  assignSuggestedVolunteerForDelivery,
  findAndAssignVolunteer,
};