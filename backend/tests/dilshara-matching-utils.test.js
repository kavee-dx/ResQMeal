const {
  MATCH_CRITERIA,
  DEFAULT_MAX_DELIVERY_DISTANCE_KM,
} = require("../src/config/dilshara-matching.config");
const { distanceKmBetween, normalizeCoordinatePair } = require("../src/utils/dilshara-geo.util");
const { getPickupWindowRange, isWithinAvailability, getAvailabilityOverlapMinutes } = require("../src/utils/dilshara-time.util");
const { areaMatch, resolveVolunteerPoint, resolveDonationPickupPoint } = require("../src/utils/dilshara-locationResolver.util");

describe("Dilshara matching utilities", () => {
  test("matching weights are centralized and sum to 100", () => {
    expect(MATCH_CRITERIA.map((criterion) => criterion.key)).toEqual([
      "distance",
      "area",
      "time",
      "urgency",
    ]);
    expect(MATCH_CRITERIA.reduce((sum, criterion) => sum + criterion.weight, 0)).toBe(100);
    expect(DEFAULT_MAX_DELIVERY_DISTANCE_KM).toBe(10);
  });

  test("safe coordinate validation and distance calculations reject invalid inputs", () => {
    expect(normalizeCoordinatePair({ latitude: 6.9271, longitude: 79.8612 })).toMatchObject({
      latitude: 6.9271,
      longitude: 79.8612,
    });
    expect(normalizeCoordinatePair({ latitude: 100, longitude: 0 })).toBeNull();
    // Unset coordinates must never become the valid (0, 0) point.
    expect(normalizeCoordinatePair({ latitude: null, longitude: null })).toBeNull();
    expect(normalizeCoordinatePair({ latitude: "", longitude: "" })).toBeNull();
    expect(normalizeCoordinatePair({ latitude: undefined, longitude: undefined })).toBeNull();
    expect(distanceKmBetween({ latitude: 6.9271, longitude: 79.8612 }, { latitude: 7.2906, longitude: 80.6337 })).toBeGreaterThan(0);
  });

  test("pickup windows and volunteer availability are safe and timezone aware", () => {
    const window = getPickupWindowRange({
      start: "2026-09-24T18:00:00+05:30",
      end: "2026-09-24T20:00:00+05:30",
    });

    expect(window).not.toBeNull();
    expect(window.minutes).toBe(120);

    expect(
      isWithinAvailability({ availableDays: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], availableFrom: "18:00", availableTo: "22:00" }, "2026-09-24T12:30:00Z")
    ).toBe(true);
    expect(getAvailabilityOverlapMinutes({ availableDays: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"], availableFrom: "18:00", availableTo: "22:00" }, new Date("2026-09-24T12:30:00Z"), new Date("2026-09-24T14:00:00Z"))).toBeGreaterThan(0);
  });

  test("location resolution prefers exact coordinates and falls back to district centres", () => {
    const exact = resolveDonationPickupPoint({
      pickupLocation: { latitude: 6.9271, longitude: 79.8612 },
    });
    expect(exact.exact).toBe(true);

    const approximate = resolveVolunteerPoint({ maxDeliveryDistance: 10 }, { district: "Colombo" });
    expect(approximate.precision).toBe("APPROXIMATE");

    // A stored location object with null coordinates means "not set", so the
    // district centre is used instead of a bogus exact (0, 0) point.
    const nullCoords = resolveVolunteerPoint(
      { maxDeliveryDistance: 10, location: { latitude: null, longitude: null, updatedAt: null } },
      { district: "Colombo" }
    );
    expect(nullCoords).toMatchObject({ district: "Colombo", precision: "APPROXIMATE" });

    // No coordinates and no recognisable district = no usable location.
    expect(
      resolveVolunteerPoint({ location: { latitude: null, longitude: null } }, { district: "Nowhere" })
    ).toBeNull();

    const area = areaMatch("Colombo", ["Colombo", "Kandy"]);
    expect(area.level).toBe("EXACT");
  });
});
