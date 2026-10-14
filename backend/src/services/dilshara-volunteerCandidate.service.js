// Loads everything the matching engine needs to know about volunteers, using a
// fixed number of queries (not one per volunteer). It makes no decisions.
// Owner: Dilshara

const User = require("../models/dushani-User");
const VolunteerProfile = require("../models/dushani-VolunteerProfile");
const VolunteerAvailability = require("../models/dilshara-VolunteerAvailability");
const VolunteerDeliveryPreferences = require("../models/dilshara-VolunteerDeliveryPreferences");
const Assignment = require("../models/dilshara-Assignment");
const { ACTIVE_ASSIGNMENT_STATUSES } = require("../config/dilshara-matching.config");

const MAX_CANDIDATES = 2000;

const byUserId = (rows) => new Map(rows.map((row) => [String(row.userId), row]));

async function loadVolunteerCandidates(donationId) {
  const users = await User.find({ role: "VOLUNTEER" })
    .select("fullName role accountStatus approvalStatus district city address")
    .sort({ _id: 1 })
    .limit(MAX_CANDIDATES)
    .lean();

  if (users.length === 0) return [];

  const ids = users.map((user) => user._id);

  const [profiles, availabilities, preferences, activeAssignments, cancelled] = await Promise.all([
    VolunteerProfile.find({ userId: { $in: ids } })
      .select("userId vehicleType preferredDeliveryArea preferredDeliveryTime")
      .lean(),
    VolunteerAvailability.find({ userId: { $in: ids } })
      .select("userId availabilityStatus availableDays availableFrom availableTo")
      .lean(),
    VolunteerDeliveryPreferences.find({ userId: { $in: ids } })
      .select("userId maxDeliveryDistance location")
      .lean(),
    Assignment.find({ volunteerId: { $in: ids }, status: { $in: ACTIVE_ASSIGNMENT_STATUSES } })
      .select("volunteerId")
      .lean(),
    // Volunteers who declined/cancelled THIS donation. System cancellations
    // (e.g. the recipient cancelled) do not count against the volunteer.
    Assignment.find({
      donationId,
      status: "CANCELLED",
      cancelledBy: { $ne: "SYSTEM" },
      volunteerId: { $in: ids },
    })
      .select("volunteerId")
      .lean(),
  ]);

  const profileMap = byUserId(profiles);
  const availabilityMap = byUserId(availabilities);
  const preferencesMap = byUserId(preferences);
  const busy = new Set(activeAssignments.map((row) => String(row.volunteerId)));
  const previouslyCancelled = new Set(cancelled.map((row) => String(row.volunteerId)));

  return users.map((user) => {
    const userId = String(user._id);
    return {
      userId,
      user: {
        fullName: user.fullName || null,
        role: user.role,
        accountStatus: user.accountStatus,
        approvalStatus: user.approvalStatus,
        district: user.district,
        city: user.city,
        address: user.address,
      },
      profile: profileMap.get(userId) || null,
      availability: availabilityMap.get(userId) || null,
      preferences: preferencesMap.get(userId) || null,
      hasActiveAssignment: busy.has(userId),
      previouslyCancelled: previouslyCancelled.has(userId),
    };
  });
}

module.exports = { loadVolunteerCandidates };