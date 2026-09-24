// Validates the payload for PATCH /api/volunteer-profile/availability
// Owner: Dilshara

const VALID_STATUS = ["AVAILABLE", "UNAVAILABLE"];
const VALID_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validateAvailabilityPayload(body) {
  const { availabilityStatus, availableDays, availableFrom, availableTo } = body;

  if (!VALID_STATUS.includes(availabilityStatus)) {
    return "availabilityStatus must be AVAILABLE or UNAVAILABLE.";
  }

  if (!Array.isArray(availableDays)) {
    return "availableDays must be an array.";
  }

  const hasInvalidDay = availableDays.some((d) => !VALID_DAYS.includes(d));
  if (hasInvalidDay) {
    return "availableDays contains an invalid day value.";
  }

  if (availabilityStatus === "AVAILABLE") {
    if (availableDays.length === 0) {
      return "Select at least one available day.";
    }
    if (!TIME_REGEX.test(availableFrom) || !TIME_REGEX.test(availableTo)) {
      return "availableFrom/availableTo must be in HH:mm format.";
    }
    if (availableFrom >= availableTo) {
      return '"Available from" must be earlier than "available to".';
    }
  }

  return null; // no error
}

module.exports = { validateAvailabilityPayload };