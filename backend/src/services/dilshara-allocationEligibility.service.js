// Checks whether a volunteer is eligible to receive a delivery assignment.
// Owner: Dilshara

const VolunteerAvailability = require("../models/dilshara-VolunteerAvailability");
const Assignment = require("../models/dilshara-Assignment");

const ACTIVE_ASSIGNMENT_STATUSES = [
  "ASSIGNED",
  "ACCEPTED",
  "PICKING_UP",
  "IN_TRANSIT",
];

function getCurrentDay() {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[new Date().getDay()];
}

function timeToMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

async function isVolunteerEligibleNow(userId, expectedStatus = "IDLE") {
  // Find the volunteer's availability settings
  const availability = await VolunteerAvailability.findOne({ userId });

  if (!availability) {
    return {
      eligible: false,
      reason: "No availability settings found",
    };
  }

  // Volunteer must currently be marked AVAILABLE
  if (availability.availabilityStatus !== "AVAILABLE") {
    return {
      eligible: false,
      reason: "Volunteer is unavailable",
    };
  }

  // Check today's availability
  const currentDay = getCurrentDay();

  if (
    Array.isArray(availability.availableDays) &&
    availability.availableDays.length > 0 &&
    !availability.availableDays.includes(currentDay)
  ) {
    return {
      eligible: false,
      reason: `Volunteer is not available on ${currentDay}`,
    };
  }

  // Check current time against the volunteer's available time window
  const now = new Date();

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const fromMinutes = timeToMinutes(availability.availableFrom);
  const toMinutes = timeToMinutes(availability.availableTo);

  if (
    fromMinutes !== null &&
    toMinutes !== null &&
    fromMinutes !== toMinutes
  ) {
    let withinTimeWindow = false;

    // Normal window, e.g. 16:00 -> 22:00
    if (fromMinutes < toMinutes) {
      withinTimeWindow =
        currentMinutes >= fromMinutes && currentMinutes <= toMinutes;
    } else {
      // Overnight window, e.g. 22:00 -> 06:00
      withinTimeWindow =
        currentMinutes >= fromMinutes || currentMinutes <= toMinutes;
    }

    if (!withinTimeWindow) {
      return {
        eligible: false,
        reason: "Outside volunteer availability hours",
      };
    }
  }

  // A volunteer should not receive another assignment while
  // an existing active assignment is still in progress.
  const activeAssignment = await Assignment.findOne({
    volunteerId: userId,
    status: { $in: ACTIVE_ASSIGNMENT_STATUSES },
  });

  if (activeAssignment) {
    return {
      eligible: false,
      reason: "Volunteer already has an active assignment",
    };
  }

  // expectedStatus is currently used by the allocation service
  // to indicate that the volunteer should be idle.
  if (expectedStatus !== "IDLE") {
    return {
      eligible: false,
      reason: `Unexpected volunteer status: ${expectedStatus}`,
    };
  }

  return {
    eligible: true,
    reason: "Volunteer is eligible",
  };
}

module.exports = {
  isVolunteerEligibleNow,
};