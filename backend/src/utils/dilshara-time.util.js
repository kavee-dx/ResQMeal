const { MIN_WINDOW_OVERLAP_MINUTES } = require("../config/dilshara-matching.config");

const DAY_ORDER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function parseNullableDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(value.getTime());
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function clampMinutes(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
}

function toColomboDate(dateValue) {
  const safeDate = parseNullableDate(dateValue);
  if (!safeDate) {
    return null;
  }

  const local = new Date(safeDate.toLocaleString("en-US", { timeZone: "Asia/Colombo" }));
  return Number.isFinite(local.getTime()) ? local : null;
}

function getDatePartsInColombo(dateValue) {
  const safeDate = toColomboDate(dateValue);
  if (!safeDate) {
    return null;
  }

  return {
    date: safeDate.toISOString().slice(0, 10),
    day: DAY_ORDER[safeDate.getDay()],
    hour: safeDate.getHours(),
    minute: safeDate.getMinutes(),
    seconds: safeDate.getSeconds(),
    full: safeDate,
  };
}

function normalizeTimeString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
    return null;
  }

  const [hoursText, minutesText] = trimmed.split(":");
  return {
    hours: Number(hoursText),
    minutes: Number(minutesText),
    totalMinutes: Number(hoursText) * 60 + Number(minutesText),
  };
}

function timeToMinutes(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = normalizeTimeString(String(value));
  return parsed ? parsed.totalMinutes : null;
}

function addDays(dateValue, days) {
  const base = parseNullableDate(dateValue);
  if (!base) {
    return null;
  }
  const next = new Date(base.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function minutesToDate(dateValue, minutesFromMidnight) {
  const base = parseNullableDate(dateValue);
  if (!base || !Number.isFinite(minutesFromMidnight)) {
    return null;
  }

  const clone = new Date(base.getTime());
  clone.setHours(0, 0, 0, 0);
  clone.setMinutes(clone.getMinutes() + minutesFromMidnight);
  return clone;
}

function getPickupWindowRange(window) {
  if (!window || typeof window !== "object") {
    return null;
  }

  const start = parseNullableDate(
    window.start ?? window.pickupStart ?? window.windowStart ?? window.from ?? window.begin ?? window.beginAt
  );
  const end = parseNullableDate(
    window.end ?? window.pickupEnd ?? window.windowEnd ?? window.to ?? window.finish ?? window.finishAt
  );

  if (!start || !end) {
    return null;
  }

  if (end.getTime() < start.getTime()) {
    return null;
  }

  return {
    start,
    end,
    minutes: Math.max(0, (end.getTime() - start.getTime()) / 60000),
  };
}

function getEffectivePickupWindow(donation, now = new Date()) {
  if (!donation || typeof donation !== "object") {
    return null;
  }

  const currentTime = parseNullableDate(now) || new Date();
  const start = parseNullableDate(
    donation.pickupWindowStart ?? donation.pickupStart ?? donation.windowStart ?? donation.availabilityStart ?? donation.preparationTime
  );
  const end = parseNullableDate(
    donation.pickupWindowEnd ?? donation.pickupEnd ?? donation.windowEnd ?? donation.availabilityEnd ?? donation.expiryTime
  );

  if (!start || !end || end.getTime() <= start.getTime()) {
    return null;
  }

  const window = {
    start,
    end,
    minutes: Math.max(0, (end.getTime() - start.getTime()) / 60000),
    now: currentTime,
  };

  if (currentTime.getTime() > end.getTime()) {
    return null;
  }

  return window;
}

function getDayTimeAvailability(availability) {
  if (!availability || typeof availability !== "object") {
    return null;
  }

  const availableDays = Array.isArray(availability.availableDays)
    ? availability.availableDays.map((day) => String(day).trim().toUpperCase()).filter(Boolean)
    : [];

  const availableFrom = availability.availableFrom ?? availability.from ?? null;
  const availableTo = availability.availableTo ?? availability.to ?? null;

  const fromMinutes = timeToMinutes(availableFrom);
  const toMinutes = timeToMinutes(availableTo);

  if (!availableDays.length && fromMinutes === null && toMinutes === null) {
    return null;
  }

  return {
    availableDays,
    availableFrom,
    availableTo,
    fromMinutes,
    toMinutes,
  };
}

function isWithinAvailability(availability, dateValue) {
  const safeDate = parseNullableDate(dateValue) || new Date();
  const local = toColomboDate(safeDate);
  if (!local) return false;

  const meta = getDayTimeAvailability(availability);
  if (!meta) return false;

  const currentDay = DAY_ORDER[local.getDay()];
  const hasDayRestriction = meta.availableDays.length > 0;
  if (hasDayRestriction && !meta.availableDays.includes(currentDay)) {
    return false;
  }

  if (meta.fromMinutes === null || meta.toMinutes === null) {
    return true;
  }

  const currentMinutes = local.getHours() * 60 + local.getMinutes();
  if (meta.fromMinutes === meta.toMinutes) {
    return true;
  }

  if (meta.fromMinutes < meta.toMinutes) {
    return currentMinutes >= meta.fromMinutes && currentMinutes <= meta.toMinutes;
  }

  return currentMinutes >= meta.fromMinutes || currentMinutes <= meta.toMinutes;
}

function timeOverlapMinutes(windowA, windowB) {
  const first = getPickupWindowRange(windowA);
  const second = getPickupWindowRange(windowB);

  if (!first || !second) {
    return 0;
  }

  const overlapStart = new Date(Math.max(first.start.getTime(), second.start.getTime()));
  const overlapEnd = new Date(Math.min(first.end.getTime(), second.end.getTime()));

  if (overlapEnd.getTime() <= overlapStart.getTime()) {
    return 0;
  }

  return Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / 60000);
}

function getAvailabilityOverlapMinutes(availability, windowStart, windowEnd) {
  const windowRange = getPickupWindowRange({ start: windowStart, end: windowEnd });
  if (!windowRange) {
    return 0;
  }

  const availabilityMeta = getDayTimeAvailability(availability);
  if (!availabilityMeta) {
    return 0;
  }

  const { fromMinutes, toMinutes, availableDays } = availabilityMeta;
  if (fromMinutes === null || toMinutes === null) {
    return 0;
  }

  let overlapMinutes = 0;
  let cursor = new Date(windowRange.start.getTime());
  const finish = new Date(windowRange.end.getTime());

  while (cursor <= finish) {
    const local = toColomboDate(cursor);
    if (!local) {
      break;
    }

    const dayName = DAY_ORDER[local.getDay()];
    const isDayAvailable = availableDays.length === 0 || availableDays.includes(dayName);
    if (isDayAvailable) {
      const dayStart = new Date(local.getTime());
      dayStart.setHours(0, 0, 0, 0);
      const intervalStart = minutesToDate(dayStart, fromMinutes);
      const intervalEnd = minutesToDate(dayStart, toMinutes);

      if (intervalStart && intervalEnd) {
        const availabilityWindow = {
          start: intervalStart,
          end: intervalEnd,
        };

        if (fromMinutes < toMinutes) {
          overlapMinutes += timeOverlapMinutes({ start: windowRange.start, end: windowRange.end }, availabilityWindow);
        } else {
          const overnightStart = intervalStart;
          const overnightEnd = addDays(dayStart, 1);
          if (overnightEnd) {
            overnightEnd.setHours(0, 0, 0, 0);
            overnightEnd.setMinutes(toMinutes);
            overlapMinutes += timeOverlapMinutes({ start: windowRange.start, end: windowRange.end }, {
              start: overnightStart,
              end: overnightEnd,
            });
          }
        }
      }
    }

    cursor = addDays(cursor, 1);
  }

  return Math.max(0, overlapMinutes);
}

function getWindowCoverage(availability, window) {
  const range = getPickupWindowRange(window);
  if (!range || !range.minutes) {
    return 0;
  }

  const overlap = getAvailabilityOverlapMinutes(availability, range.start, range.end);
  return overlap >= 0 ? overlap / range.minutes : 0;
}

function isWithinPickupWindow(dateValue, window) {
  const safeDate = parseNullableDate(dateValue);
  const range = getPickupWindowRange(window);

  if (!safeDate || !range) {
    return false;
  }

  return safeDate.getTime() >= range.start.getTime() && safeDate.getTime() <= range.end.getTime();
}

function hasTimeOverlap(availability, window) {
  const range = getPickupWindowRange(window);
  if (!range || !availability) {
    return false;
  }

  const overlapMinutes = getAvailabilityOverlapMinutes(availability, range.start, range.end);
  return overlapMinutes >= MIN_WINDOW_OVERLAP_MINUTES;
}

module.exports = {
  parseNullableDate,
  clampMinutes,
  toColomboDate,
  getDatePartsInColombo,
  normalizeTimeString,
  timeToMinutes,
  addDays,
  minutesToDate,
  getPickupWindowRange,
  getEffectivePickupWindow,
  getDayTimeAvailability,
  isWithinAvailability,
  timeOverlapMinutes,
  getAvailabilityOverlapMinutes,
  getWindowCoverage,
  isWithinPickupWindow,
  hasTimeOverlap,
};
