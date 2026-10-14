// Focused tests for the Dilshara volunteer scoring service: factor formulas,
// weighted total precision/rounding, area proximity banding, human-readable
// reasons, determinism and tie-break order.
const {
  MATCH_CRITERIA,
  AREA_SCORES,
  NEUTRAL_URGENCY_SCORE,
  NEARBY_DISTRICT_KM,
  URGENCY_SPLIT,
} = require("../src/config/dilshara-matching.config");
const {
  scoreDistance,
  scoreTime,
  scoreArea,
  scoreUrgency,
  combineScores,
  scoreCandidate,
  compareRanked,
} = require("../src/services/dilshara-volunteerScoring.service");
const {
  findDistrictCentre,
  distanceKmBetween,
  routeDistance,
} = require("../src/utils/dilshara-geo.util");

const COLOMBO = { latitude: 6.9271, longitude: 79.8612, district: "Colombo", precision: "APPROXIMATE" };
const KANDY = { latitude: 7.2906, longitude: 80.6337, district: "Kandy", precision: "APPROXIMATE" };

// Thursday 2026-10-15, 18:00 -> 20:00 Sri Lanka time.
const WINDOW = {
  start: new Date("2026-10-15T18:00:00+05:30"),
  end: new Date("2026-10-15T20:00:00+05:30"),
  minutes: 120,
};

const buildContext = (overrides = {}) => ({
  pickup: COLOMBO,
  dropoff: COLOMBO,
  areaTexts: ["Colombo"],
  urgent: false,
  now: new Date("2026-10-15T17:30:00+05:30"),
  window: WINDOW,
  ...overrides,
});

const buildCandidate = (overrides = {}) => ({
  userId: "v1",
  user: { district: "Colombo" },
  profile: { preferredDeliveryArea: "Colombo" },
  availability: {
    availabilityStatus: "AVAILABLE",
    availableDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
    availableFrom: "18:00",
    availableTo: "20:00",
  },
  preferences: { maxDeliveryDistance: 15, location: { latitude: 6.9271, longitude: 79.8612 } },
  ...overrides,
});

const buildEvaluation = (overrides = {}) => {
  const point = overrides.volunteerPoint || {
    latitude: 6.9271,
    longitude: 79.8612,
    precision: "EXACT",
    district: "Colombo",
  };
  const route = routeDistance(point, COLOMBO, COLOMBO);
  return {
    eligible: true,
    reasons: [],
    details: {
      volunteerPoint: point,
      route,
      maxDistanceKm: 15,
      overlapMinutes: WINDOW.minutes * (overrides.coverage ?? 1),
      coverage: overrides.coverage ?? 1,
    },
  };
};

describe("Dilshara volunteer scoring", () => {
  test("config carries the agreed scoring values", () => {
    expect(AREA_SCORES).toEqual({ EXACT: 100, NEARBY: 50, NONE: 0 });
    expect(NEARBY_DISTRICT_KM).toBe(30);
    expect(NEUTRAL_URGENCY_SCORE).toBe(70);
    expect(URGENCY_SPLIT).toEqual({ availableNow: 0.5, proximity: 0.5 });
    expect(MATCH_CRITERIA.map((criterion) => [criterion.key, criterion.weight])).toEqual([
      ["distance", 40],
      ["area", 25],
      ["time", 20],
      ["urgency", 15],
    ]);
  });

  test("distance score follows the formula and clamps to 0-100", () => {
    expect(scoreDistance(0, 10)).toBe(100);
    expect(scoreDistance(5, 10)).toBe(50);
    expect(scoreDistance(2.5, 10)).toBe(75);
    expect(scoreDistance(10, 10)).toBe(0);
    expect(scoreDistance(14, 10)).toBe(0);
    expect(scoreDistance(5, 0)).toBe(0);
    expect(scoreDistance(NaN, 10)).toBe(0);
  });

  test("time score is the covered share of the pickup window, clamped", () => {
    expect(scoreTime(0)).toBe(0);
    expect(scoreTime(0.25)).toBe(25);
    expect(scoreTime(0.5)).toBe(50);
    expect(scoreTime(1)).toBe(100);
    expect(scoreTime(1.4)).toBe(100);
    expect(scoreTime(-0.2)).toBe(0);
  });

  test("urgency: neutral 70 for normal deliveries, 50/50 split when urgent", () => {
    expect(
      scoreUrgency({ urgent: false, availableNow: false, volunteerToPickupKm: 9, maxDistanceKm: 10 })
    ).toBe(70);
    expect(
      scoreUrgency({ urgent: true, availableNow: true, volunteerToPickupKm: 0, maxDistanceKm: 10 })
    ).toBe(100);
    expect(
      scoreUrgency({ urgent: true, availableNow: false, volunteerToPickupKm: 0, maxDistanceKm: 10 })
    ).toBe(50);
    expect(
      scoreUrgency({ urgent: true, availableNow: true, volunteerToPickupKm: 10, maxDistanceKm: 10 })
    ).toBe(50);
  });

  test("weighted total keeps internal precision and rounds once to one decimal", () => {
    const simple = combineScores({ distance: 50, area: 100, time: 75, urgency: 70 });
    expect(simple.total).toBe(70.5);
    expect(simple.points).toEqual({ distance: 20, area: 25, time: 15, urgency: 10.5 });

    // Factors with repeating decimals: the total must come from full-precision
    // factors, not from factor values rounded beforehand.
    const raw = {
      distance: 100 * (1 - 4.4 / 12),
      area: 100,
      time: (2 / 3) * 100,
      urgency: 70,
    };
    const expectedTotal =
      0.4 * raw.distance + 0.25 * raw.area + 0.2 * raw.time + 0.15 * raw.urgency;
    const precise = combineScores(raw);
    expect(precise.total).toBe(Math.round(expectedTotal * 10) / 10);
    expect(precise.total).toBeCloseTo(74.2, 1);
    expect(precise.points.distance).toBeCloseTo(0.4 * raw.distance, 2);
    expect(precise.points.time).toBeCloseTo(0.2 * raw.time, 2);
  });

  test("area score: exact preferred-area text match wins", () => {
    const area = scoreArea("Colombo", buildContext({ areaTexts: ["Colombo", "Kandy"] }));
    expect(area).toMatchObject({ level: "EXACT", score: 100, matchedArea: "Colombo" });
  });

  test("area score: preferred district within 30 km of a delivery end counts as nearby", () => {
    const gampaha = findDistrictCentre("Gampaha");
    expect(gampaha).not.toBeNull();
    const kmFromPickup = distanceKmBetween(gampaha, COLOMBO);
    expect(kmFromPickup).toBeGreaterThan(0);
    expect(kmFromPickup).toBeLessThanOrEqual(NEARBY_DISTRICT_KM);

    const area = scoreArea("Gampaha", buildContext({ areaTexts: ["Colombo"] }));
    expect(area).toMatchObject({ level: "NEARBY", score: 50, matchedArea: "Gampaha" });
  });

  test("area score: a district beyond 30 km and an unknown area both score 0", () => {
    const kalutara = findDistrictCentre("Kalutara");
    expect(distanceKmBetween(kalutara, COLOMBO)).toBeGreaterThan(NEARBY_DISTRICT_KM);
    expect(scoreArea("Kalutara", buildContext({ areaTexts: ["Colombo"] }))).toMatchObject({
      level: "NONE",
      score: 0,
    });

    expect(scoreArea("Atlantis", buildContext())).toMatchObject({ level: "NONE", score: 0 });
    expect(scoreArea(undefined, buildContext())).toMatchObject({ level: "NONE", score: 0 });
  });

  test("scoreCandidate returns total, factor scores, reasons and route metadata", () => {
    const evaluation = buildEvaluation();
    const entry = scoreCandidate(buildCandidate(), buildContext(), evaluation);

    expect(entry.userId).toBe("v1");
    expect(entry.routeDistanceKm).toBe(evaluation.details.route.totalKm);
    expect(entry.locationPrecision).toBe(evaluation.details.route.precision);
    expect(entry.breakdown.distance.score).toBe(100);
    expect(entry.breakdown.area.score).toBe(100);
    expect(entry.breakdown.time.score).toBe(100);
    expect(entry.breakdown.urgency.score).toBe(70);

    // 0.4*100 + 0.25*100 + 0.2*100 + 0.15*70
    expect(entry.score).toBe(95.5);
    expect(Number(entry.score.toFixed(1))).toBe(entry.score);

    expect(entry.reasons).toContain("Volunteer is in the same district as the pickup");
    expect(
      entry.reasons.some((reason) => reason.includes('Preferred area "Colombo" matches this delivery'))
    ).toBe(true);
    expect(entry.reasons.some((reason) => reason.includes("100% of the pickup window"))).toBe(true);
  });

  test("nearby preferred area contributes 50 points and is explained", () => {
    const candidate = buildCandidate({ profile: { preferredDeliveryArea: "Gampaha" } });
    const entry = scoreCandidate(candidate, buildContext(), buildEvaluation());

    expect(entry.breakdown.area.score).toBe(50);
    expect(
      entry.reasons.some((reason) =>
        reason.includes('Preferred area "Gampaha" is in a nearby district (within 30 km)')
      )
    ).toBe(true);
    // 0.4*100 + 0.25*50 + 0.2*100 + 0.15*70
    expect(entry.score).toBe(83);
  });

  test("urgent deliveries weigh current availability and proximity to pickup", () => {
    const availableNow = scoreCandidate(
      buildCandidate(),
      buildContext({ urgent: true, now: new Date("2026-10-15T18:30:00+05:30") }),
      buildEvaluation()
    );
    expect(availableNow.breakdown.urgency.score).toBe(100);
    expect(availableNow.reasons.some((reason) => reason.includes("available right now"))).toBe(true);

    const later = scoreCandidate(
      buildCandidate(),
      buildContext({ urgent: true, now: new Date("2026-10-15T17:30:00+05:30") }),
      buildEvaluation()
    );
    expect(later.breakdown.urgency.score).toBe(50);
    expect(later.reasons.some((reason) => reason.includes("not available right now"))).toBe(true);
  });

  test("time factor reflects partial pickup-window coverage", () => {
    const entry = scoreCandidate(buildCandidate(), buildContext(), buildEvaluation({ coverage: 0.25 }));
    expect(entry.breakdown.time.score).toBe(25);
    expect(entry.reasons.some((reason) => reason.includes("25% of the pickup window"))).toBe(true);
  });

  test("approximate routes are explained and never printed with fabricated precision", () => {
    const entry = scoreCandidate(buildCandidate(), buildContext(), buildEvaluation());
    const routeReason = entry.reasons.find((reason) => reason.startsWith("Estimated route"));
    expect(routeReason).toContain("approximate");
    expect(routeReason).toContain("~");
    expect(routeReason).not.toMatch(/\d+\.\d{2}\s*km/);

    // Exact coordinates are reported as-is, without the approximate note.
    const pickExact = { latitude: 6.9271, longitude: 79.8612, precision: "EXACT", district: "Colombo" };
    const volunteerPoint = { latitude: 6.9, longitude: 79.85, precision: "EXACT", district: "Colombo" };
    const context = buildContext({ pickup: pickExact, dropoff: pickExact });
    const exactEvaluation = {
      eligible: true,
      reasons: [],
      details: {
        volunteerPoint,
        route: routeDistance(volunteerPoint, pickExact, pickExact),
        maxDistanceKm: 15,
        overlapMinutes: 120,
        coverage: 1,
      },
    };
    const exactEntry = scoreCandidate(buildCandidate(), context, exactEvaluation);
    expect(exactEntry.locationPrecision).toBe("EXACT");
    const exactReason = exactEntry.reasons.find((reason) => reason.startsWith("Estimated route"));
    expect(exactReason).not.toContain("approximate");
    expect(exactReason).toContain(`${exactEntry.routeDistanceKm} km`);
  });

  test("scoring is deterministic and does not mutate its inputs", () => {
    const candidate = buildCandidate();
    const context = buildContext();
    const evaluation = buildEvaluation();

    const candidateBefore = JSON.stringify(candidate);
    const contextBefore = JSON.stringify(context);
    const first = scoreCandidate(candidate, context, evaluation);
    const second = scoreCandidate(candidate, context, evaluation);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(candidate)).toBe(candidateBefore);
    expect(JSON.stringify(context)).toBe(contextBefore);
  });

  test("ranking ties break by shorter route, then stable volunteer id", () => {
    const entries = [
      { userId: "b", score: 80, routeDistanceKm: 10 },
      { userId: "a", score: 80, routeDistanceKm: 10 },
      { userId: "z", score: 80, routeDistanceKm: 5 },
      { userId: "c", score: 90, routeDistanceKm: 99 },
    ];

    const sorted = [...entries].sort(compareRanked).map((entry) => entry.userId);
    expect(sorted).toEqual(["c", "z", "a", "b"]);

    // Reversing the input must not change the outcome.
    const reversed = [...entries].reverse().sort(compareRanked).map((entry) => entry.userId);
    expect(reversed).toEqual(sorted);
  });

  test("out-of-district pickups are not claimed as same district", () => {
    const context = buildContext({ pickup: KANDY, dropoff: KANDY, areaTexts: ["Kandy"] });
    const evaluation = {
      eligible: true,
      reasons: [],
      details: {
        volunteerPoint: { latitude: 6.9271, longitude: 79.8612, precision: "EXACT", district: "Colombo" },
        route: routeDistance(
          { latitude: 6.9271, longitude: 79.8612, district: "Colombo" },
          KANDY,
          KANDY
        ),
        maxDistanceKm: 15,
        overlapMinutes: 120,
        coverage: 1,
      },
    };
    const entry = scoreCandidate(buildCandidate(), context, evaluation);
    expect(entry.reasons).not.toContain("Volunteer is in the same district as the pickup");
  });
});
