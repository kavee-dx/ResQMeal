const DISTRICT_CENTRES = require("../data/amasha-sriLankaDistricts");

const EARTH_RADIUS_KM = 6371;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLatitude(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= -90 && num <= 90;
}

function isValidLongitude(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= -180 && num <= 180;
}

// Explicitly unset coordinates (null/undefined/empty in the stored document)
// mean "no location on file". Never let Number(null) === 0 turn them into a
// valid (0, 0) point off the coast of Africa.
function hasCoordinateValue(value) {
  return value !== null && value !== undefined && !(typeof value === "string" && value.trim() === "");
}

function normalizeCoordinatePair(point) {
  if (!point || typeof point !== "object") return null;

  if (!hasCoordinateValue(point.latitude) || !hasCoordinateValue(point.longitude)) {
    return null;
  }

  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);

  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    precision: point.precision || "EXACT",
    district: point.district || null,
    source: point.source || "coordinates",
  };
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKmBetween(a, b) {
  const pointA = normalizeCoordinatePair(a);
  const pointB = normalizeCoordinatePair(b);

  if (!pointA || !pointB) {
    return null;
  }

  const lat1 = toRadians(pointA.latitude);
  const lon1 = toRadians(pointA.longitude);
  const lat2 = toRadians(pointB.latitude);
  const lon2 = toRadians(pointB.longitude);

  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_KM * centralAngle;
}

function sameDistrict(a, b) {
  const left = (a && a.district) ? String(a.district).trim().toLowerCase() : "";
  const right = (b && b.district) ? String(b.district).trim().toLowerCase() : "";
  return Boolean(left && right && left === right);
}

function routeDistance(volunteerPoint, pickupPoint, dropoffPoint) {
  if (!volunteerPoint || !pickupPoint || !dropoffPoint) {
    return null;
  }

  const volunteer = normalizeCoordinatePair(volunteerPoint);
  const pickup = normalizeCoordinatePair(pickupPoint);
  const dropoff = normalizeCoordinatePair(dropoffPoint);

  if (!volunteer || !pickup || !dropoff) {
    return null;
  }

  const volunteerPickupKm = distanceKmBetween(volunteer, pickup);
  const pickupDropoffKm = distanceKmBetween(pickup, dropoff);

  if (volunteerPickupKm === null || pickupDropoffKm === null) {
    return null;
  }

  const precision =
    volunteer.precision === "EXACT" &&
    pickup.precision === "EXACT" &&
    dropoff.precision === "EXACT"
      ? "EXACT"
      : "APPROXIMATE";

  return {
    totalKm: Number((volunteerPickupKm + pickupDropoffKm).toFixed(2)),
    precision,
    volunteerToPickup: {
      km: Number(volunteerPickupKm.toFixed(2)),
      sameDistrict: sameDistrict(volunteer, pickup),
      district: pickup.district || volunteer.district || null,
    },
    pickupToDropoff: {
      km: Number(pickupDropoffKm.toFixed(2)),
      sameDistrict: sameDistrict(pickup, dropoff),
      district: dropoff.district || pickup.district || null,
    },
  };
}

function findDistrictCentre(name) {
  if (!name || typeof name !== "string") {
    return null;
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }

  const lookup = trimmed.toLowerCase();
  const match = Object.keys(DISTRICT_CENTRES).find((district) => {
    const normalizedDistrict = district.toLowerCase();
    return normalizedDistrict === lookup || normalizedDistrict.includes(lookup) || lookup.includes(normalizedDistrict);
  });

  if (!match) {
    return null;
  }

  return {
    ...DISTRICT_CENTRES[match],
    precision: "APPROXIMATE",
    district: match,
    source: "district-center",
  };
}

module.exports = {
  EARTH_RADIUS_KM,
  isFiniteNumber,
  isValidLatitude,
  isValidLongitude,
  normalizeCoordinatePair,
  distanceKmBetween,
  routeDistance,
  findDistrictCentre,
  sameDistrict,
};
