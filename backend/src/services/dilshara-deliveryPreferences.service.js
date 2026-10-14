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
    preferredDeliveryArea:
      profile?.preferredDeliveryArea || preferences?.preferredDeliveryArea || "",
    preferredDeliveryTime:
      profile?.preferredDeliveryTime || preferences?.preferredDeliveryTime || "",
    maxDeliveryDistance: preferences?.maxDeliveryDistance ?? null,
    location: {
      latitude: preferences?.location?.latitude ?? null,
      longitude: preferences?.location?.longitude ?? null,
    },
  };
}

async function updateDeliveryPreferences(userId, payload) {
  const { preferredDeliveryArea, preferredDeliveryTime, maxDeliveryDistance, location } = payload;

  const preferencesUpdate = {
    preferredDeliveryArea: preferredDeliveryArea.trim(),
    maxDeliveryDistance,
  };
  if (preferredDeliveryTime !== undefined) {
    preferencesUpdate.preferredDeliveryTime = preferredDeliveryTime.trim();
  }

  if (location) {
    preferencesUpdate["location.latitude"] = location.latitude;
    preferencesUpdate["location.longitude"] = location.longitude;
    preferencesUpdate["location.updatedAt"] = new Date();
  }

  await VolunteerDeliveryPreferences.findOneAndUpdate(
    { userId },
    { $set: preferencesUpdate, $setOnInsert: { userId } },
    { new: true, upsert: true, runValidators: true }
  );

  // Keep existing volunteer profile fields synchronized when a profile exists,
  // but do not make saving matching preferences depend on that separate record.
  const profileUpdate = { preferredDeliveryArea: preferredDeliveryArea.trim() };
  if (preferredDeliveryTime !== undefined) {
    profileUpdate.preferredDeliveryTime = preferredDeliveryTime.trim();
  }
  await VolunteerProfile.findOneAndUpdate(
    { userId },
    { $set: profileUpdate },
    { new: true, runValidators: true }
  );

  return getDeliveryPreferences(userId);
}

module.exports = { getDeliveryPreferences, updateDeliveryPreferences };