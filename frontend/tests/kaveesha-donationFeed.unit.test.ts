// frontend/tests/kaveesha-donationFeed.unit.test.ts
// Owner: Kaveesha
//
// Unit tests for the pure rules behind the donor home feed
// (src/utils/kaveesha-donationFeed.ts). No rendering, no network - these check
// the words, the filtering and the numbers the home page shows.

import type { Donation, DonationStatus } from "../src/types/kaveesha-donation.types";

import {
  DONATION_FOOT_NOTE,
  buildDonorFeed,
  countToneFilters,
  donationExpiryLabel,
  donationPostedLabel,
  donationRouteId,
  donationStatusMeta,
  isVisibleInDonorFeed,
  isUrgentDonation,
  matchesDonationQuery,
  matchesToneFilter,
  sortDonationsNewestFirst,
  summarizeDonorImpact,
} from "../src/utils/kaveesha-donationFeed";

function makeDonation(overrides: Partial<Donation> = {}): Donation {
  return {
    id: "donation-1",
    foodType: "Rice & Curry",
    foodCategory: "Cooked meal",
    quantity: 10,
    numberOfPortions: 20,
    preparationTime: "2026-10-19T09:00:00.000Z",
    expiryTime: "2026-10-19T18:00:00.000Z",
    status: "active",
    foodName: "Rice & Curry",
    category: "Cooked meal",
    portions: 20,
    pickupLocation: "12 Galle Road, Colombo",
    urgency: "NORMAL",
    expiresInHours: 6,
    createdAt: "2026-10-19T08:00:00.000Z",
    ...overrides,
  };
}

/* ========================================================= */
/* STATUS LABELS                                              */
/* ========================================================= */

describe("donationStatusMeta", () => {
  it("names every status the way the home page shows it", () => {
    expect(donationStatusMeta("active")).toEqual({
      label: "Open for rescue",
      icon: "pulse-outline",
      tone: "success",
    });

    expect(donationStatusMeta("pending")).toEqual({
      label: "Waiting for match",
      icon: "hourglass-outline",
      tone: "warning",
    });

    expect(donationStatusMeta("completed")).toEqual({
      label: "Delivered",
      icon: "checkmark-done-outline",
      tone: "info",
    });

    expect(donationStatusMeta("cancelled")).toEqual({
      label: "Cancelled",
      icon: "close-circle-outline",
      tone: "muted",
    });
  });

  it("falls back to Expired for anything unexpected", () => {
    const meta = donationStatusMeta("expired" as DonationStatus);

    expect(meta.label).toBe("Expired");
    expect(meta.tone).toBe("danger");
  });

  it("keeps a note for every status so a post never reads as blank", () => {
    const statuses: DonationStatus[] = [
      "active",
      "pending",
      "completed",
      "cancelled",
      "expired",
    ];

    statuses.forEach((status) => {
      expect(DONATION_FOOT_NOTE[status]).toBeTruthy();
    });
  });
});

/* ========================================================= */
/* URGENCY                                                    */
/* ========================================================= */

describe("isUrgentDonation", () => {
  it("treats a post marked URGENT at posting time as urgent", () => {
    expect(
      isUrgentDonation(makeDonation({ donationType: "URGENT" })),
    ).toBe(true);
  });

  it("also honours the normalised HIGH urgency", () => {
    expect(isUrgentDonation(makeDonation({ urgency: "HIGH" }))).toBe(
      true,
    );
  });

  it("keeps ordinary posts on the normal side", () => {
    expect(
      isUrgentDonation(
        makeDonation({ donationType: "NORMAL", urgency: "NORMAL" }),
      ),
    ).toBe(false);

    expect(isUrgentDonation(makeDonation({ urgency: "MEDIUM" }))).toBe(
      false,
    );

    /* A post saved before either field existed is not urgent. */
    expect(
      isUrgentDonation(
        makeDonation({ donationType: undefined, urgency: undefined as never }),
      ),
    ).toBe(false);
  });
});

/* ========================================================= */
/* ROUTE ID                                                   */
/* ========================================================= */

describe("donationRouteId", () => {
  it("prefers id when the record carries one", () => {
    expect(donationRouteId(makeDonation({ id: "abc", _id: "xyz" }))).toBe(
      "abc",
    );
  });

  it("falls back to _id, because /donor/donations answers with lean documents", () => {
    const lean = { _id: "651f0c" } as unknown as Donation;

    expect(donationRouteId(lean)).toBe("651f0c");
  });

  it("answers with an empty string when there is no identifier at all", () => {
    expect(donationRouteId({} as unknown as Donation)).toBe("");
  });

  it("turns an ObjectId-like value into a string so navigation never gets an object", () => {
    const lean = {
      _id: { toString: () => "oid-1" } as unknown as string,
    } as unknown as Donation;

    expect(donationRouteId(lean)).toBe("oid-1");
  });
});

/* ========================================================= */
/* LABELS ON A POST                                           */
/* ========================================================= */

describe("donationExpiryLabel", () => {
  it("only counts down while the post can still be claimed", () => {
    expect(donationExpiryLabel(makeDonation({ status: "completed" }))).toBeNull();
    expect(donationExpiryLabel(makeDonation({ status: "cancelled" }))).toBeNull();
    expect(donationExpiryLabel(makeDonation({ status: "expired" }))).toBeNull();
  });

  it("shows hours for the same day and says Closing now once the window is gone", () => {
    expect(donationExpiryLabel(makeDonation({ status: "active", expiresInHours: 5 }))).toBe("5h left");
    expect(donationExpiryLabel(makeDonation({ status: "pending", expiresInHours: 47 }))).toBe("47h left");
    expect(donationExpiryLabel(makeDonation({ expiresInHours: 0 }))).toBe("Closing now");
    expect(donationExpiryLabel(makeDonation({ expiresInHours: -3 }))).toBe("Closing now");
  });

  it("switches to days from 48 hours and rounds them", () => {
    expect(donationExpiryLabel(makeDonation({ expiresInHours: 48 }))).toBe("2d left");
    expect(donationExpiryLabel(makeDonation({ expiresInHours: 77 }))).toBe("3d left");
  });

  it("stays silent when the remaining time is missing or unreadable", () => {
    expect(donationExpiryLabel(makeDonation({ expiresInHours: undefined as never }))).toBeNull();
    expect(donationExpiryLabel(makeDonation({ expiresInHours: Number.NaN }))).toBeNull();
  });
});

describe("donationPostedLabel", () => {
  const BASE = new Date("2026-10-19T12:00:00.000Z").getTime();

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(BASE);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function ago(minutes: number): string {
    return new Date(BASE - minutes * 60_000).toISOString();
  }

  it("reads a brand new post as Just now", () => {
    expect(donationPostedLabel(ago(0))).toBe("Just now");
    expect(donationPostedLabel(new Date(BASE - 30_000).toISOString())).toBe(
      "Just now",
    );
  });

  it("uses minutes inside the hour, hours inside the day and days inside the week", () => {
    expect(donationPostedLabel(ago(1))).toBe("1m ago");
    expect(donationPostedLabel(ago(59))).toBe("59m ago");
    expect(donationPostedLabel(ago(60))).toBe("1h ago");
    expect(donationPostedLabel(ago(60 * 24 - 1))).toBe("23h ago");
    expect(donationPostedLabel(ago(60 * 24))).toBe("1d ago");
    expect(donationPostedLabel(ago(60 * 24 * 6))).toBe("6d ago");
  });

  it("switches to an actual date once the post is older than a week", () => {
    const createdAt = ago(60 * 24 * 12);

    expect(donationPostedLabel(createdAt)).toBe(
      new Date(createdAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      }),
    );

    expect(donationPostedLabel(createdAt)).not.toMatch(/ago$/);
  });

  it("never invents a time when the post has none or the value is unreadable", () => {
    expect(donationPostedLabel(undefined)).toBe("Recent post");
    expect(donationPostedLabel("")).toBe("Recent post");
    expect(donationPostedLabel("not a date")).toBe("Recent post");
  });
});

/* ========================================================= */
/* FEED RULES                                                 */
/* ========================================================= */

describe("isVisibleInDonorFeed", () => {
  it("hides expired posts on the home page", () => {
    expect(isVisibleInDonorFeed(makeDonation({ status: "expired" }))).toBe(false);
  });

  it("keeps every other post", () => {
    (["active", "pending", "completed", "cancelled"] as DonationStatus[]).forEach(
      (status) => {
        expect(isVisibleInDonorFeed(makeDonation({ status }))).toBe(true);
      },
    );
  });
});

describe("matchesToneFilter", () => {
  const urgent = makeDonation({ id: "u", donationType: "URGENT" });
  const normal = makeDonation({ id: "n", donationType: "NORMAL" });

  it("lets both tones through while no chip is selected", () => {
    expect(matchesToneFilter(urgent, null)).toBe(true);
    expect(matchesToneFilter(normal, null)).toBe(true);
  });

  it("keeps only time-critical posts under the Urgent chip", () => {
    expect(matchesToneFilter(urgent, "urgent")).toBe(true);
    expect(matchesToneFilter(normal, "urgent")).toBe(false);
  });

  it("keeps only the rest under the Normal chip", () => {
    expect(matchesToneFilter(urgent, "normal")).toBe(false);
    expect(matchesToneFilter(normal, "normal")).toBe(true);
  });
});

describe("matchesDonationQuery", () => {
  const donation = makeDonation({
    foodName: "Kottu roti",
    category: "Cooked meal",
    donationCode: "RSQ-2026-014",
    pickupLocation: "12 Galle Road, Colombo",
  });

  it("matches everything on an empty or blank search", () => {
    expect(matchesDonationQuery(donation, "")).toBe(true);
    expect(matchesDonationQuery(donation, "   ")).toBe(true);
  });

  it("ignores letter case and stray spaces", () => {
    expect(matchesDonationQuery(donation, "  KOTTU ")).toBe(true);
    expect(matchesDonationQuery(donation, "roti")).toBe(true);
  });

  it("searches the name, the category, the post code and the pickup area", () => {
    expect(matchesDonationQuery(donation, "cooked")).toBe(true);
    expect(matchesDonationQuery(donation, "rsq-2026")).toBe(true);
    expect(matchesDonationQuery(donation, "galle road")).toBe(true);
  });

  it("rejects words the post does not contain", () => {
    expect(matchesDonationQuery(donation, "bread")).toBe(false);
  });

  it("does not crash on a post that is missing its labels", () => {
    const bare = { status: "active" } as unknown as Donation;

    expect(matchesDonationQuery(bare, "rice")).toBe(false);
    expect(matchesDonationQuery(bare, "")).toBe(true);
  });
});

describe("sortDonationsNewestFirst", () => {
  it("puts the most recent post first", () => {
    const oldest = makeDonation({ id: "old", createdAt: "2026-10-17T08:00:00.000Z" });
    const newest = makeDonation({ id: "new", createdAt: "2026-10-19T08:00:00.000Z" });
    const middle = makeDonation({ id: "mid", createdAt: "2026-10-18T08:00:00.000Z" });

    const sorted = sortDonationsNewestFirst([oldest, newest, middle]);

    expect(sorted.map((donation) => donation.id)).toEqual(["new", "mid", "old"]);
  });

  it("leaves the caller's array untouched", () => {
    const list = [
      makeDonation({ id: "old", createdAt: "2026-10-17T08:00:00.000Z" }),
      makeDonation({ id: "new", createdAt: "2026-10-19T08:00:00.000Z" }),
    ];

    sortDonationsNewestFirst(list);

    expect(list.map((donation) => donation.id)).toEqual(["old", "new"]);
  });

  it("keeps posts without a date at the end instead of producing NaN comparisons", () => {
    const dated = makeDonation({ id: "dated", createdAt: "2026-10-19T08:00:00.000Z" });
    const undated = makeDonation({ id: "undated", createdAt: undefined });

    const sorted = sortDonationsNewestFirst([undated, dated]);

    expect(sorted.map((donation) => donation.id)).toEqual(["dated", "undated"]);
  });
});

describe("buildDonorFeed", () => {
  const posts = [
    makeDonation({ id: "live-urgent", donationType: "URGENT", createdAt: "2026-10-19T08:00:00.000Z" }),
    makeDonation({ id: "live-normal", donationType: "NORMAL", createdAt: "2026-10-18T08:00:00.000Z" }),
    makeDonation({ id: "expired", status: "expired", createdAt: "2026-10-20T08:00:00.000Z" }),
    makeDonation({ id: "delivered", status: "completed", foodName: "Bread packs", createdAt: "2026-10-17T08:00:00.000Z" }),
  ];

  it("drops expired posts even when they are the newest", () => {
    const feed = buildDonorFeed(posts, { query: "", filter: null });

    expect(feed.map((donation) => donation.id)).toEqual([
      "live-urgent",
      "live-normal",
      "delivered",
    ]);
  });

  it("applies the words and the chip together", () => {
    expect(
      buildDonorFeed(posts, { query: "bread", filter: null }).map((d) => d.id),
    ).toEqual(["delivered"]);

    expect(
      buildDonorFeed(posts, { query: "", filter: "urgent" }).map((d) => d.id),
    ).toEqual(["live-urgent"]);

    expect(
      buildDonorFeed(posts, { query: "bread", filter: "urgent" }),
    ).toEqual([]);
  });

  it("answers with an empty feed when the donor has nothing posted", () => {
    expect(buildDonorFeed([], { query: "", filter: null })).toEqual([]);
  });
});

describe("countToneFilters", () => {
  it("counts the pool the chips actually open", () => {
    const counts = countToneFilters([
      makeDonation({ id: "1", donationType: "URGENT" }),
      makeDonation({ id: "2", urgency: "HIGH" }),
      makeDonation({ id: "3", donationType: "NORMAL" }),
      makeDonation({ id: "4", status: "expired", donationType: "URGENT" }),
    ]);

    expect(counts).toEqual({ urgent: 2, normal: 1 });
  });

  it("starts at zero rather than undefined", () => {
    expect(countToneFilters([])).toEqual({ urgent: 0, normal: 0 });
  });
});

describe("summarizeDonorImpact", () => {
  it("adds up the portions the donor really pledged", () => {
    const impact = summarizeDonorImpact([
      makeDonation({ id: "1", status: "active", numberOfPortions: 20, portions: 20 }),
      makeDonation({ id: "2", status: "completed", numberOfPortions: 30, portions: 30 }),
      makeDonation({ id: "3", status: "pending", numberOfPortions: 15, portions: 15 }),
    ]);

    expect(impact).toEqual({ pledged: 65, delivered: 30, live: 2 });
  });

  it("still counts expired and cancelled pledges, because they were really offered", () => {
    const impact = summarizeDonorImpact([
      makeDonation({ id: "1", status: "expired", numberOfPortions: 40, portions: 40 }),
      makeDonation({ id: "2", status: "cancelled", numberOfPortions: 10, portions: 10 }),
    ]);

    expect(impact.pledged).toBe(50);
    expect(impact.delivered).toBe(0);
    expect(impact.live).toBe(0);
  });

  it("reads the backend portion field when the UI alias is missing", () => {
    const impact = summarizeDonorImpact([
      makeDonation({ status: "completed", numberOfPortions: 12, portions: undefined as never }),
    ]);

    expect(impact).toEqual({ pledged: 12, delivered: 12, live: 0 });
  });

  it("treats a donation with no portion count as zero instead of NaN", () => {
    const impact = summarizeDonorImpact([
      makeDonation({ numberOfPortions: undefined as never, portions: undefined as never }),
    ]);

    expect(impact.pledged).toBe(0);
    expect(impact.delivered).toBe(0);
  });

  it("says nothing at all before the first post", () => {
    expect(summarizeDonorImpact([])).toEqual({ pledged: 0, delivered: 0, live: 0 });
  });
});
