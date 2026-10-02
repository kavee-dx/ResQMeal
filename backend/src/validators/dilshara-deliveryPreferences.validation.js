// Validation for volunteer delivery preferences payloads.
// Owner: Dilshara

const { MAX_DELIVERY_DISTANCE_KM } = require("../models/dilshara-VolunteerDeliveryPreferences");

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// Returns an error message string, or null when the payload is valid
// (same convention as validateAvailabilityPayload).
function validateDeliveryPreferencesPayload(body) {
  const { preferredDeliveryArea, preferredDeliveryTime, maxDeliveryDistance, location } = body || {};

  if (typeof preferredDeliveryArea !== "string" || !preferredDeliveryArea.trim()) {
    return "Preferred delivery area is required.";
  }
  if (preferredDeliveryArea.trim().length > 100) {
    return "Preferred delivery area cannot exceed 100 characters.";
  }

  if (preferredDeliveryTime !== undefined) {
    if (typeof preferredDeliveryTime !== "string") {
      return "Preferred delivery time must be text.";
    }
    if (preferredDeliveryTime.trim().length > 50) {
      return "Preferred delivery time cannot exceed 50 characters.";
    }
  }

  if (!isFiniteNumber(maxDeliveryDistance) || maxDeliveryDistance <= 0) {
    return "Maximum delivery distance must be a positive number.";
  }
  if (maxDeliveryDistance > MAX_DELIVERY_DISTANCE_KM) {
    return `Maximum delivery distance cannot exceed ${MAX_DELIVERY_DISTANCE_KM} km.`;
  }

  // Location is optional; when supplied it must be complete and in range.
  if (location !== undefined && location !== null) {
    if (
      typeof location !== "object" ||
      !isFiniteNumber(location.latitude) ||
      !isFiniteNumber(location.longitude)
    ) {
      return "Location must include a numeric latitude and longitude.";
    }
    if (location.latitude < -90 || location.latitude > 90) {
      return "Latitude must be between -90 and 90.";
    }
    if (location.longitude < -180 || location.longitude > 180) {
      return "Longitude must be between -180 and 180.";
    }
  }

  return null;
}

module.exports = { validateDeliveryPreferencesPayload };