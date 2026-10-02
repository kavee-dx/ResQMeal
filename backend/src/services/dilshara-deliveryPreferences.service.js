// Reads/writes volunteer delivery preferences across two collections:
//  - VolunteerProfile (Owner: Dushani): preferredDeliveryArea, preferredDeliveryTime
//  - VolunteerDeliveryPreferences (Owner: Dilshara): maxDeliveryDistance, location
// Owner: Dilshara

const VolunteerProfile = require("../models/dushani-VolunteerProfile");
const VolunteerDeliveryPreferences = require("../models/dilshara-VolunteerDeliveryPreferences");

async function getDeliveryPreferences(userId) {
  const [profile, preferences] = await Promise.all([
    VolunteerProfile.findOne({ userId }).select("preferredDeliveryArea preferredDeliveryTime"),
    VolunteerDeliveryPreferences.findOne({ userId }),
  ]);

  return {
    preferredDeliveryArea: profile?.preferredDeliveryArea ?? "",
    preferredDeliveryTime: profile?.preferredDeliveryTime ?? "",
    maxDeliveryDistance: preferences?.maxDeliveryDistance ?? null,
    location: {
      latitude: preferences?.location?.latitude ?? null,
      longitude: preferences?.location?.longitude ?? null,
    },
  };
}

async function updateDeliveryPreferences(userId, payload) {
  const { preferredDeliveryArea, preferredDeliveryTime, maxDeliveryDistance, location } = payload;

  // 1. Only touch the two existing profile fields — no schema change to Dushani's model.
  const profileUpdate = { preferredDeliveryArea: preferredDeliveryArea.trim() };
  if (preferredDeliveryTime !== undefined) {
    profileUpdate.preferredDeliveryTime = preferredDeliveryTime.trim();
  }

  const profile = await VolunteerProfile.findOneAndUpdate(
    { userId },
    { $set: profileUpdate },
    { new: true, runValidators: true }
  );

  // Done first so nothing is written to preferences for a volunteer without a profile.
  if (!profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  // 2. Matching-specific data owned by this component.
  const preferencesUpdate = { maxDeliveryDistance };
  if (location) {
    preferencesUpdate["location.latitude"] = location.latitude;
    preferencesUpdate["location.longitude"] = location.longitude;
    preferencesUpdate["location.updatedAt"] = new Date();
  }

  await VolunteerDeliveryPreferences.findOneAndUpdate(
    { userId },
    { $set: preferencesUpdate },
    { new: true, upsert: true, runValidators: true }
  );

  return getDeliveryPreferences(userId);
}

module.exports = { getDeliveryPreferences, updateDeliveryPreferences };