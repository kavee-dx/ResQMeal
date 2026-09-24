// Checks whether a volunteer is eligible to receive a new assignment,
// based on their VolunteerAvailability record. Used by the (future)
// full allocation/matching service — RESQ-197.
// Owner: Dilshara

const VolunteerAvailability = require("../models/dilshara-VolunteerAvailability");

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function isWithinTimeWindow(nowHHmm, from, to) {
  return nowHHmm >= from && nowHHmm <= to;
}

async function isVolunteerEligibleNow(userId, currentDeliveryStatus = "IDLE") {
  const availability = await VolunteerAvailability.findOne({ userId });
  if (!availability) return { eligible: false, reason: "No availability set." };

  if (availability.availabilityStatus !== "AVAILABLE") {
    return { eligible: false, reason: "Volunteer is marked unavailable." };
  }

  if (currentDeliveryStatus !== "IDLE") {
    return { eligible: false, reason: "Volunteer is already on a delivery." };
  }

  const now = new Date();
  const todayCode = DAY_CODES[now.getDay()];
  if (!availability.availableDays.includes(todayCode)) {
    return { eligible: false, reason: "Not an available day." };
  }

  const nowHHmm = now.toTimeString().slice(0, 5);
  if (!isWithinTimeWindow(nowHHmm, availability.availableFrom, availability.availableTo)) {
    return { eligible: false, reason: "Outside available time window." };
  }

  return { eligible: true, reason: null };
}

module.exports = { isVolunteerEligibleNow };