// frontend/tests/kaveesha-greeting.unit.test.ts
// Owner: Kaveesha
//
// Unit tests for the greeting the donor header opens with
// (src/utils/kaveesha-greeting.ts). The clock is pinned so each band is
// checked at its own boundary.

import { getGreeting } from "../src/utils/kaveesha-greeting";

function greetAtHour(hour: number): string {
  jest.setSystemTime(new Date(2026, 9, 19, hour, 30, 0, 0));

  return getGreeting();
}

describe("getGreeting", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("says good morning right up to midday", () => {
    expect(greetAtHour(0)).toBe("Good morning");
    expect(greetAtHour(5)).toBe("Good morning");
    expect(greetAtHour(11)).toBe("Good morning");
  });

  it("switches to good afternoon at midday", () => {
    expect(greetAtHour(12)).toBe("Good afternoon");
    expect(greetAtHour(16)).toBe("Good afternoon");
  });

  it("switches to good evening at five", () => {
    expect(greetAtHour(17)).toBe("Good evening");
    expect(greetAtHour(23)).toBe("Good evening");
  });
});
