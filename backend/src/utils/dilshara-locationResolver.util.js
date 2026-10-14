const { findDistrictCentre, normalizeCoordinatePair, sameDistrict } = require("./dilshara-geo.util");

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function getLocationMeta(rawLocation) {
  if (!rawLocation) {
    return null;
  }

  if (typeof rawLocation === "string") {
    const districtCentre = findDistrictCentre(rawLocation);
    if (districtCentre) {
      return {
        ...districtCentre,
        label: rawLocation,
        exact: false,
      };
    }
    return null;
  }

  if (typeof rawLocation !== "object") {
    return null;
  }

  const coordinateSource = rawLocation.coordinates || rawLocation.location || rawLocation.geo || rawLocation.point || null;
  if (coordinateSource && typeof coordinateSource === "object") {
    const normalized = normalizeCoordinatePair(coordinateSource);
    if (normalized) {
      return {
        ...normalized,
        label: rawLocation.label || rawLocation.name || rawLocation.district || "Exact coordinates",
        exact: true,
      };
    }
  }

  const coordinatePair = normalizeCoordinatePair(rawLocation);
  if (coordinatePair) {
    return {
      ...coordinatePair,
      label: rawLocation.label || rawLocation.name || rawLocation.district || "Exact coordinates",
      exact: true,
    };
  }

  const districtName = rawLocation.district || rawLocation.area || rawLocation.city || rawLocation.name || null;
  if (districtName) {
    const districtCentre = findDistrictCentre(districtName);
    if (districtCentre) {
      return {
        ...districtCentre,
        label: districtName,
        exact: false,
      };
    }
  }

  return null;
}

function areaMatch(preferredArea, areaTexts) {
  const preferred = normalizeText(preferredArea);
  if (!preferred) {
    return { level: "NONE", matchedArea: null };
  }

  const texts = Array.isArray(areaTexts) ? areaTexts.filter(Boolean) : [];
  if (!texts.length) {
    return { level: "NONE", matchedArea: preferredArea };
  }

  for (const text of texts) {
    const normalizedText = normalizeText(text);
    if (!normalizedText) continue;
    if (normalizedText === preferred || normalizedText.includes(preferred) || preferred.includes(normalizedText)) {
      return { level: "EXACT", matchedArea: text };
    }
  }

  for (const text of texts) {
    const normalizedText = normalizeText(text);
    if (!normalizedText) continue;
    if (normalizedText.includes(preferred.slice(0, 4)) || preferred.includes(normalizedText.slice(0, 4))) {
      return { level: "NEARBY", matchedArea: text };
    }
  }

  return { level: "NONE", matchedArea: preferredArea };
}

function resolveVolunteerPoint(preferences, user) {
  if (!preferences && !user) {
    return null;
  }

  const preferenceLocation = preferences && (preferences.location || preferences.baseLocation || preferences.preferredLocation);
  const directCoords = preferenceLocation && (preferenceLocation.coordinates || preferenceLocation.location || preferenceLocation.geo || preferenceLocation.point || preferenceLocation);
  const exactPoint = normalizeCoordinatePair(directCoords || preferenceLocation);
  if (exactPoint) {
    return { ...exactPoint, precision: "EXACT", source: "preferences" };
  }

  const userDistrict = user && (user.district || user.city || user.address);
  const districtCentre = findDistrictCentre(userDistrict || (preferences && preferences.district) || "");
  if (districtCentre) {
    return { ...districtCentre, precision: "APPROXIMATE", source: "district-centre" };
  }

  return null;
}

function resolveVolunteerLocation(volunteer) {
  if (!volunteer) {
    return null;
  }

  const candidates = [
    volunteer.preferredLocation,
    volunteer.location,
    volunteer.address,
    volunteer.profile && (volunteer.profile.location || volunteer.profile.preferredLocation || volunteer.profile.address),
    volunteer.deliveryPreferences && (volunteer.deliveryPreferences.location || volunteer.deliveryPreferences.baseLocation),
  ];

  for (const candidate of candidates) {
    const result = getLocationMeta(candidate);
    if (result) {
      return result;
    }
  }

  const district = volunteer.profile?.preferredDeliveryArea || volunteer.user?.district || volunteer.district || null;
  if (district) {
    const centre = findDistrictCentre(district);
    if (centre) {
      return { ...centre, exact: false, label: district, precision: "APPROXIMATE" };
    }
  }

  return null;
}

function resolveDonationPickupPoint(donation) {
  if (!donation) {
    return null;
  }

  const candidateLocations = [
    donation.pickupLocation,
    donation.pickupCoordinates,
    donation.location,
    donation.pickupAddress,
    donation.donorLocation,
    donation.donor && (donation.donor.location || donation.donor.address),
  ];

  for (const candidate of candidateLocations) {
    const resolved = getLocationMeta(candidate);
    if (resolved) {
      return resolved;
    }
  }

  const districtName = donation.pickupDistrict || donation.donorDistrict || donation.district || null;
  if (districtName) {
    const centre = findDistrictCentre(districtName);
    if (centre) {
      return { ...centre, precision: "APPROXIMATE", exact: false, label: districtName, source: "district-centre" };
    }
  }

  return null;
}

function resolveRecipientDropoffPoint(request, recipientUser) {
  if (!request && !recipientUser) {
    return null;
  }

  const candidateLocations = [
    request && (request.dropoffLocation || request.dropOffLocation || request.deliveryLocation || request.recipientLocation || request.location),
    recipientUser && (recipientUser.location || recipientUser.address),
    recipientUser && recipientUser.district,
    request && request.recipient && (request.recipient.location || request.recipient.address),
  ];

  for (const candidate of candidateLocations) {
    if (!candidate) continue;
    const resolved = getLocationMeta(candidate);
    if (resolved) {
      return resolved;
    }
  }

  const districtName = (request && request.location) || (recipientUser && (recipientUser.district || recipientUser.city)) || null;
  if (districtName) {
    const centre = findDistrictCentre(String(districtName));
    if (centre) {
      return { ...centre, precision: "APPROXIMATE", exact: false, label: districtName, source: "district-centre" };
    }
  }

  return null;
}

function resolvePickupLocation(donation) {
  return resolveDonationPickupPoint(donation);
}

function resolveDropoffLocation(request, recipientUser) {
  return resolveRecipientDropoffPoint(request, recipientUser);
}

module.exports = {
  normalizeText,
  getLocationMeta,
  areaMatch,
  resolveVolunteerPoint,
  resolveVolunteerLocation,
  resolveDonationPickupPoint,
  resolveRecipientDropoffPoint,
  resolvePickupLocation,
  resolveDropoffLocation,
  sameDistrict,
};
