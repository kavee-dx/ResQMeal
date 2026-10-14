// Weighted scoring for ELIGIBLE volunteers. Deterministic, explainable rules +
// weighted scoring - not a trained ML model, and no LLM picks the volunteer.
// Every factor is 0-100; the weights come from the matching config. Factors are
// kept at full precision while combining; only the returned score is rounded
// (one decimal) for display and storage.
// Owner: Dilshara

const {
  MATCH_CRITERIA,
  NEUTRAL_URGENCY_SCORE,
  URGENCY_SPLIT,
  AREA_SCORES,
  NEARBY_DISTRICT_KM,
  ROUTE_PRECISION,
} = require("../config/dilshara-matching.config");
const { areaMatch } = require("../utils/dilshara-locationResolver.util");
const { findDistrictCentre, distanceKmBetween } = require("../utils/dilshara-geo.util");
const { isWithinAvailability } = require("../utils/dilshara-time.util");

const clamp100 = (value) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;

// 100 when the route is 0 km, 0 at (or beyond) the volunteer's maximum.
function scoreDistance(totalKm, maxDistanceKm) {
  if (!(maxDistanceKm > 0) || !Number.isFinite(totalKm)) return 0;
  return clamp100(100 * (1 - totalKm / maxDistanceKm));
}

// Share of the pickup window the volunteer's hours cover.
const scoreTime = (coverage) => clamp100(coverage * 100);

// Preferred area: 100 when the preferred area text matches a delivery area
// text, 50 when the preferred area's district centre is within
// NEARBY_DISTRICT_KM of the pickup or drop-off point, 0 otherwise. The 30 km
// check is based on district-centre estimates, so it is only ever reported as
// a band - never as a precise distance.
function scoreArea(preferredDeliveryArea, context) {
  const match = areaMatch(preferredDeliveryArea, context.areaTexts);
  if (match.level === "EXACT") {
    return { level: "EXACT", score: AREA_SCORES.EXACT, matchedArea: match.matchedArea };
  }

  const preferredCentre = findDistrictCentre(preferredDeliveryArea);
  if (preferredCentre) {
    const isNearby = [context.pickup, context.dropoff].some((point) => {
      const km = distanceKmBetween(preferredCentre, point);
      return Number.isFinite(km) && km <= NEARBY_DISTRICT_KM;
    });
    if (isNearby) {
      return { level: "NEARBY", score: AREA_SCORES.NEARBY, matchedArea: preferredDeliveryArea };
    }
  }

  return { level: "NONE", score: AREA_SCORES.NONE, matchedArea: match.matchedArea || null };
}

// Normal delivery: same neutral score for everyone, so it never changes the
// ranking. Urgent delivery: half "available right now", half "close to pickup".
function scoreUrgency({ urgent, availableNow, volunteerToPickupKm, maxDistanceKm }) {
  if (!urgent) return NEUTRAL_URGENCY_SCORE;
  const proximity = scoreDistance(volunteerToPickupKm, maxDistanceKm);
  return clamp100(
    (availableNow ? 100 : 0) * URGENCY_SPLIT.availableNow + proximity * URGENCY_SPLIT.proximity
  );
}

// scores: { distance, area, time, urgency } (0-100 each)
// -> { total (0-100, one decimal), points (weighted contribution of each factor) }
function combineScores(scores) {
  const points = {};
  let total = 0;
  for (const criterion of MATCH_CRITERIA) {
    const value = (clamp100(scores[criterion.key]) * criterion.weight) / 100;
    points[criterion.key] = round2(value);
    total += value;
  }
  return { total: round1(total), points };
}

function buildReasons({ route, maxDistanceKm, area, coverage, urgent, availableNow }) {
  const reasons = [];

  if (route.volunteerToPickup.sameDistrict) {
    reasons.push("Volunteer is in the same district as the pickup");
  }
  // District-centre estimates are never printed with decimal precision.
  const approximate = route.precision === ROUTE_PRECISION.APPROXIMATE;
  const routeKmText = approximate ? `~${Math.round(route.totalKm)} km` : `${route.totalKm} km`;
  reasons.push(
    `Estimated route ${routeKmText} (volunteer limit ${maxDistanceKm} km)` +
      (approximate ? " - approximate, based on district-centre locations" : "")
  );

  if (area.level === "EXACT") {
    reasons.push(`Preferred area "${area.matchedArea}" matches this delivery`);
  } else if (area.level === "NEARBY") {
    reasons.push(
      `Preferred area "${area.matchedArea}" is in a nearby district (within ${NEARBY_DISTRICT_KM} km)`
    );
  }

  reasons.push(`Available for ${Math.round(coverage * 100)}% of the pickup window`);

  if (urgent) {
    reasons.push(
      availableNow
        ? "Urgent delivery: volunteer is available right now"
        : "Urgent delivery: volunteer is not available right now"
    );
  }
  return reasons;
}

// candidate: from the candidate loader; evaluation: from evaluateCandidate (eligible).
function scoreCandidate(candidate, context, evaluation) {
  const { route, maxDistanceKm, coverage } = evaluation.details;

  const area = scoreArea(candidate.profile?.preferredDeliveryArea, context);
  const availableNow = candidate.availability
    ? isWithinAvailability(candidate.availability, context.now)
    : false;

  const scores = {
    distance: scoreDistance(route.totalKm, maxDistanceKm),
    area: area.score,
    time: scoreTime(coverage),
    urgency: scoreUrgency({
      urgent: context.urgent,
      availableNow,
      volunteerToPickupKm: route.volunteerToPickup.km,
      maxDistanceKm,
    }),
  };

  const { total, points } = combineScores(scores);

  const breakdown = {};
  for (const criterion of MATCH_CRITERIA) {
    breakdown[criterion.key] = {
      score: round1(scores[criterion.key]),
      points: points[criterion.key],
    };
  }

  return {
    userId: candidate.userId,
    volunteer: {
      displayName: candidate.user?.fullName || "Volunteer",
      vehicleType: candidate.profile?.vehicleType || null,
      preferredDeliveryArea: candidate.profile?.preferredDeliveryArea || null,
    },
    score: total,
    breakdown,
    reasons: buildReasons({ route, maxDistanceKm, area, coverage, urgent: context.urgent, availableNow }),
    routeDistanceKm: route.totalKm,
    locationPrecision: route.precision,
  };
}

// Highest score first, then the shorter route, then a stable id order.
function compareRanked(a, b) {
  return (
    b.score - a.score ||
    a.routeDistanceKm - b.routeDistanceKm ||
    String(a.userId).localeCompare(String(b.userId))
  );
}

module.exports = {
  scoreDistance,
  scoreTime,
  scoreArea,
  scoreUrgency,
  combineScores,
  scoreCandidate,
  compareRanked,
};