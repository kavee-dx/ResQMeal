// Hard eligibility rules for volunteer matching.
// Eligibility runs before scoring: a candidate that fails any rule is rejected
// and never scored. Evaluation is deterministic and side-effect free - it only
// inspects already-loaded candidate data and the validated delivery context,
// creates no assignment and sends no notification.
// Owner: Dilshara

const {
  ACTIVE_ASSIGNMENT_STATUSES,
  DEFAULT_MAX_DELIVERY_DISTANCE_KM,
  MIN_WINDOW_OVERLAP_MINUTES,
} = require("../config/dilshara-matching.config");
const {
  getAvailabilityOverlapMinutes,
  getWindowCoverage,
  isWithinAvailability,
} = require("../utils/dilshara-time.util");
const { resolveVolunteerPoint } = require("../utils/dilshara-locationResolver.util");
const { routeDistance } = require("../utils/dilshara-geo.util");
const VolunteerAvailability = require("../models/dilshara-VolunteerAvailability");
const Assignment = require("../models/dilshara-Assignment");

const VOLUNTEER_ROLE = "VOLUNTEER";

const REJECTION_CODES = Object.freeze({
  ACCOUNT_NOT_ACTIVE: "ACCOUNT_NOT_ACTIVE",
  VOLUNTEER_NOT_APPROVED: "VOLUNTEER_NOT_APPROVED",
  VOLUNTEER_UNAVAILABLE: "VOLUNTEER_UNAVAILABLE",
  NO_PICKUP_WINDOW_OVERLAP: "NO_PICKUP_WINDOW_OVERLAP",
  ACTIVE_ASSIGNMENT_EXISTS: "ACTIVE_ASSIGNMENT_EXISTS",
  PREVIOUSLY_CANCELLED_THIS_DELIVERY: "PREVIOUSLY_CANCELLED_THIS_DELIVERY",
  LOCATION_UNAVAILABLE: "LOCATION_UNAVAILABLE",
  ROUTE_EXCEEDS_MAX_DISTANCE: "ROUTE_EXCEEDS_MAX_DISTANCE",
});

const REJECTION_MESSAGES = Object.freeze({
  ACCOUNT_NOT_ACTIVE: "The volunteer's account is not active.",
  VOLUNTEER_NOT_APPROVED: "The account is not an approved volunteer.",
  VOLUNTEER_UNAVAILABLE: "The volunteer is not marked as available.",
  NO_PICKUP_WINDOW_OVERLAP: "The volunteer's days and hours do not cover the pickup window.",
  ACTIVE_ASSIGNMENT_EXISTS: "The volunteer already has an active delivery.",
  PREVIOUSLY_CANCELLED_THIS_DELIVERY: "The volunteer already declined or cancelled this delivery.",
  LOCATION_UNAVAILABLE: "No usable volunteer location could be found.",
  ROUTE_EXCEEDS_MAX_DISTANCE: "The delivery route is longer than the volunteer's maximum distance.",
});

// A missing, zero or invalid saved maximum falls back to 10 km.
function resolveMaxDistanceKm(preferences) {
  const value = Number(preferences?.maxDeliveryDistance);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_DELIVERY_DISTANCE_KM;
}

// Checks one loaded candidate against one validated delivery context and
// collects every applicable rejection code (for previews). Pickup-day and
// hour checks use Sri Lanka time via the shared time utility.
// Returns { eligible, reasons: [{ code, message }], details }.
function evaluateCandidate(candidate, context) {
  const reasons = [];
  const reject = (code) => reasons.push({ code, message: REJECTION_MESSAGES[code] });

  // Only an approved VOLUNTEER account may take deliveries. A wrong role can
  // never be an approved volunteer, so it maps to the same code.
  const user = candidate.user || {};
  if (user.role !== VOLUNTEER_ROLE || user.approvalStatus !== "APPROVED") {
    reject(REJECTION_CODES.VOLUNTEER_NOT_APPROVED);
  }
  if (user.accountStatus !== "active") {
    reject(REJECTION_CODES.ACCOUNT_NOT_ACTIVE);
  }

  const availability = candidate.availability;
  if (availability?.availabilityStatus !== "AVAILABLE") {
    reject(REJECTION_CODES.VOLUNTEER_UNAVAILABLE);
  }

  // The pickup day must be an available day and the available hours must cover
  // at least MIN_WINDOW_OVERLAP_MINUTES of the effective pickup window.
  let overlapMinutes = 0;
  let coverage = 0;
  if (availability) {
    overlapMinutes = getAvailabilityOverlapMinutes(availability, context.window.start, context.window.end);
    coverage = getWindowCoverage(availability, context.window);
    // A pickup window shorter than the minimum only needs to be covered fully.
    const requiredOverlap = Math.min(MIN_WINDOW_OVERLAP_MINUTES, context.window.minutes);
    if (overlapMinutes < requiredOverlap) {
      reject(REJECTION_CODES.NO_PICKUP_WINDOW_OVERLAP);
    }
  }

  if (candidate.hasActiveAssignment) reject(REJECTION_CODES.ACTIVE_ASSIGNMENT_EXISTS);
  if (candidate.previouslyCancelled) reject(REJECTION_CODES.PREVIOUSLY_CANCELLED_THIS_DELIVERY);

  const volunteerPoint = resolveVolunteerPoint(candidate.preferences, candidate.user);
  const route = volunteerPoint ? routeDistance(volunteerPoint, context.pickup, context.dropoff) : null;
  const maxDistanceKm = resolveMaxDistanceKm(candidate.preferences);

  if (!volunteerPoint || !route) {
    reject(REJECTION_CODES.LOCATION_UNAVAILABLE);
  } else if (route.totalKm > maxDistanceKm) {
    reject(REJECTION_CODES.ROUTE_EXCEEDS_MAX_DISTANCE);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    details: { volunteerPoint, route, maxDistanceKm, overlapMinutes, coverage },
  };
}

// Filters a whole loaded candidate list against one delivery context, keeping
// the input order. Returns { eligible, rejected }: eligible entries carry the
// evaluation the scoring step needs; rejected entries carry the collected
// reasons. Pure - the same input always produces the same output.
function filterCandidates(candidates, context) {
  const eligible = [];
  const rejected = [];

  for (const candidate of candidates) {
    const evaluation = evaluateCandidate(candidate, context);
    if (evaluation.eligible) {
      eligible.push({ candidate, evaluation });
    } else {
      rejected.push({ userId: candidate.userId, reasons: evaluation.reasons });
    }
  }

  return { eligible, rejected };
}

// @deprecated Old "is this volunteer free right now" check, kept so existing
// imports keep working. Uses Sri Lanka time. New code uses evaluateCandidate.
async function isVolunteerEligibleNow(userId) {
  const [availability, active] = await Promise.all([
    VolunteerAvailability.findOne({ userId }).lean(),
    Assignment.exists({ volunteerId: userId, status: { $in: ACTIVE_ASSIGNMENT_STATUSES } }),
  ]);

  if (!availability) return { eligible: false, reason: "No availability settings found" };
  if (availability.availabilityStatus !== "AVAILABLE") {
    return { eligible: false, reason: "Volunteer is unavailable" };
  }
  if (!isWithinAvailability(availability, new Date())) {
    return { eligible: false, reason: "Outside volunteer availability days or hours" };
  }
  if (active) return { eligible: false, reason: "Volunteer already has an active assignment" };

  return { eligible: true, reason: "Volunteer is eligible" };
}

module.exports = {
  REJECTION_CODES,
  REJECTION_MESSAGES,
  resolveMaxDistanceKm,
  evaluateCandidate,
  filterCandidates,
  isVolunteerEligibleNow,
};
