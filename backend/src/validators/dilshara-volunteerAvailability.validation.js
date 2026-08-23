// Payload validation for volunteer availability updates.
// Owner: Dilshara

const ALLOWED_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validateAvailabilityPayload(body) {
  const { availabilityStatus, availableDays, availableFrom, availableTo } = body;

  if (!["AVAILABLE", "UNAVAILABLE"].includes(availabilityStatus)) {
    return "availabilityStatus must be AVAILABLE or UNAVAILABLE.";
  }

  if (!Array.isArray(availableDays) || availableDays.some((day) => !ALLOWED_DAYS.includes(day))) {
    return "availableDays must only contain MON..SUN.";
  }

  if (!TIME_FORMAT_REGEX.test(availableFrom) || !TIME_FORMAT_REGEX.test(availableTo)) {
    return "availableFrom/availableTo must be in HH:mm format.";
  }

  if (availabilityStatus === "AVAILABLE") {
    if (availableDays.length === 0) {
      return "Select at least one available day.";
    }
    if (availableFrom >= availableTo) {
      return "availableFrom must be earlier than availableTo.";
    }
  }

  return null;
}

module.exports = { validateAvailabilityPayload, ALLOWED_DAYS };