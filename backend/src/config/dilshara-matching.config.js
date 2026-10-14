// Central configuration for Dilshara volunteer matching.
// Keep all matching thresholds in one place so the scoring and eligibility
// services stay consistent with the same rules.

const ACTIVE_ASSIGNMENT_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "PICKING_UP",
  "IN_TRANSIT",
];

const MATCHABLE_REQUEST_STATUS = ["MATCHED", "DISPATCHED"];

const DELIVERABLE_DONATION_STATUSES = ["active", "pending", "expiring"];

const DEFAULT_MAX_DELIVERY_DISTANCE_KM = 10;
const MAX_DELIVERY_DISTANCE_KM = DEFAULT_MAX_DELIVERY_DISTANCE_KM;

const MATCH_CRITERIA = [
  { key: "distance", weight: 40, label: "distance" },
  { key: "area", weight: 25, label: "preferred area" },
  { key: "time", weight: 20, label: "time availability" },
  { key: "urgency", weight: 15, label: "urgency suitability" },
];

const AREA_SCORES = Object.freeze({
  EXACT: 100,
  NEARBY: 50,
  NONE: 0,
});

// A preferred area counts as nearby when its district centre lies within this
// distance of the pickup or drop-off point. District centres are estimates.
const NEARBY_DISTRICT_KM = 30;

const ROUTE_PRECISION = Object.freeze({
  EXACT: "EXACT",
  APPROXIMATE: "APPROXIMATE",
});

const URGENCY_SPLIT = Object.freeze({
  availableNow: 0.5,
  proximity: 0.5,
});

const NEUTRAL_URGENCY_SCORE = 70;
const MIN_WINDOW_OVERLAP_MINUTES = 15;

// Development-only matching preview. Hard-off in production regardless of the
// ENABLE_MATCHING_PREVIEW flag; locally it defaults to on and can be turned
// off with ENABLE_MATCHING_PREVIEW=false. Never enable this in production.
function isMatchingPreviewEnabled() {
  if (process.env.NODE_ENV === "production") return false;

  const raw = process.env.ENABLE_MATCHING_PREVIEW;
  return raw === undefined || raw === null || raw === "" || raw === "true" || raw === "1";
}

module.exports = {
  ACTIVE_ASSIGNMENT_STATUSES,
  MATCHABLE_REQUEST_STATUS,
  DELIVERABLE_DONATION_STATUSES,
  DEFAULT_MAX_DELIVERY_DISTANCE_KM,
  MAX_DELIVERY_DISTANCE_KM,
  MATCH_CRITERIA,
  AREA_SCORES,
  NEARBY_DISTRICT_KM,
  ROUTE_PRECISION,
  URGENCY_SPLIT,
  NEUTRAL_URGENCY_SCORE,
  MIN_WINDOW_OVERLAP_MINUTES,
  isMatchingPreviewEnabled,
};
