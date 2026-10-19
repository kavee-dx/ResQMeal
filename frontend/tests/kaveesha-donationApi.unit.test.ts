// frontend/tests/kaveesha-donationApi.unit.test.ts
// Owner: Kaveesha
//
// Unit tests for the donor donation API layer
// (src/services/kaveesha-donationApi.ts). The network itself is mocked, so
// what is checked here is the translation the service does in both directions:
// backend document -> what the screens read, and form state -> what the server
// accepts.

import type { Donation } from "../src/types/kaveesha-donation.types";

import type { CreateDonationState } from "../src/context/kaveesha-CreateDonationContext";

jest.mock("../src/services/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from "../src/services/api";

import {
  cancelDonation,
  createDonation,
  deleteDonation,
  getDonationById,
  getExpiryAlerts,
  getMyDonations,
  getUnreadExpiryAlertCount,
  updateDonation,
} from "../src/services/kaveesha-donationApi";

const request = api as unknown as {
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

/* Local wall-clock helper - the service builds ISO stamps from local time. */
function local(year: number, month: number, day: number, hour: number, minute: number): string {
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function makeState(
  overrides: Partial<CreateDonationState> = {},
): CreateDonationState {
  return {
    donationType: "NORMAL",
    foodType: "  Rice & Curry  ",
    category: "  Cooked meal  ",
    quantity: "10",
    quantityUnit: "kg",
    portions: "20",
    preparationDate: "2026-10-19",
    preparationTime: "10:00 AM",
    expiryDate: "2026-10-19",
    expiryTime: "6:00 PM",
    storageCondition: "Room Temperature",
    pickupLocation: "  12 Galle Road  ",
    pickupDistrict: "  Colombo  ",
    pickupAvailableFromDate: "2026-10-19",
    pickupAvailableFromTime: "2:00 PM",
    pickupAvailableUntilDate: "2026-10-19",
    pickupAvailableUntilTime: "5:00 PM",
    additionalDetails: "  Packaged in trays  ",
    photoUri: null,
    photoBase64: null,
    photoMimeType: null,
    aiResult: "PENDING",
    aiReason: "  ",
    safety: {
      storage: "YES",
      temperature: "NOT_SURE",
      handling: "YES",
      packaging: "YES",
      allergens: "NO",
    },
    ...overrides,
  };
}

/* A raw document exactly as /donor/donations answers it: lean, backend names. */
function makeLeanDonation(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    _id: "651f0c000000000000000001",
    foodType: "Rice & Curry",
    foodCategory: "Cooked meal",
    quantity: 10,
    quantityUnit: "kg",
    numberOfPortions: 24,
    preparationTime: "2026-10-19T09:00:00.000Z",
    expiryTime: "2026-10-19T18:00:00.000Z",
    availabilityStart: "2026-10-19T09:00:00.000Z",
    availabilityEnd: "2026-10-19T18:00:00.000Z",
    pickupAddress: "12 Galle Road, Colombo",
    pickupDistrict: "Colombo",
    status: "active",
    donationType: "NORMAL",
    createdAt: "2026-10-19T08:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

/* ========================================================= */
/* READING: BACKEND DOCUMENT -> SCREEN SHAPE                  */
/* ========================================================= */

describe("getMyDonations", () => {
  it("asks for everything without sending status=all to the backend", async () => {
    request.get.mockResolvedValue({
      data: { success: true, data: [] },
    });

    await getMyDonations("all");

    expect(request.get).toHaveBeenCalledWith("/donor/donations", {
      params: undefined,
    });
  });

  it("sends a single status when the donor filters", async () => {
    request.get.mockResolvedValue({
      data: { success: true, data: [] },
    });

    await getMyDonations("active");

    expect(request.get).toHaveBeenCalledWith("/donor/donations", {
      params: { status: "active" },
    });
  });

  it("gives the screens the UI names alongside the backend ones", async () => {
    request.get.mockResolvedValue({
      data: { success: true, data: [makeLeanDonation()] },
    });

    const [donation] = await getMyDonations();

    expect(donation.foodName).toBe("Rice & Curry");
    expect(donation.category).toBe("Cooked meal");
    expect(donation.portions).toBe(24);
    expect(donation.pickupLocation).toBe("12 Galle Road, Colombo");

    /* The original backend fields are still there for the edit flow. */
    expect(donation.foodType).toBe("Rice & Curry");
    expect(donation.numberOfPortions).toBe(24);
  });

  it("derives the remaining time from the end of the pickup window", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-19T12:00:00.000Z"));

    request.get.mockResolvedValue({
      data: {
        success: true,
        data: [makeLeanDonation({ availabilityEnd: "2026-10-19T14:30:00.000Z" })],
      },
    });

    const [donation] = await getMyDonations();

    /* Two and a half hours left reads as 2, never as a negative number. */
    expect(donation.expiresInHours).toBe(3);

    jest.useRealTimers();
  });

  it("clamps a window that has already closed to zero", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-19T18:00:00.000Z"));

    request.get.mockResolvedValue({
      data: {
        success: true,
        data: [makeLeanDonation({ availabilityEnd: "2026-10-19T17:00:00.000Z" })],
      },
    });

    const [donation] = await getMyDonations();

    expect(donation.expiresInHours).toBe(0);

    jest.useRealTimers();
  });

  it("falls back to expiryTime for older records without an availability window", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-19T12:00:00.000Z"));

    request.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          makeLeanDonation({
            availabilityEnd: undefined,
            expiryTime: "2026-10-19T15:00:00.000Z",
          }),
        ],
      },
    });

    const [donation] = await getMyDonations();

    expect(donation.expiresInHours).toBe(3);

    jest.useRealTimers();
  });

  it("reads an unreadable end date as no time left instead of NaN", async () => {
    request.get.mockResolvedValue({
      data: {
        success: true,
        data: [makeLeanDonation({ availabilityEnd: "not a date" })],
      },
    });

    const [donation] = await getMyDonations();

    expect(donation.expiresInHours).toBe(0);
  });

  it("keeps the urgency the backend already decided", async () => {
    request.get.mockResolvedValue({
      data: {
        success: true,
        data: [makeLeanDonation({ urgency: "HIGH" })],
      },
    });

    const [donation] = await getMyDonations();

    expect(donation.urgency).toBe("HIGH");
  });

  it("marks an URGENT post as HIGH urgency when no urgency was saved", async () => {
    request.get.mockResolvedValue({
      data: {
        success: true,
        data: [makeLeanDonation({ donationType: "URGENT" })],
      },
    });

    const [urgent] = await getMyDonations();

    expect(urgent.urgency).toBe("HIGH");
  });

  it("reads an ordinary post as NORMAL urgency", async () => {
    request.get.mockResolvedValue({
      data: { success: true, data: [makeLeanDonation()] },
    });

    const [donation] = await getMyDonations();

    expect(donation.urgency).toBe("NORMAL");
  });
});

describe("getDonationById", () => {
  it("reads one document from the donor route and normalises it", async () => {
    request.get.mockResolvedValue({
      data: { success: true, data: makeLeanDonation({ _id: "abc" }) },
    });

    const donation = await getDonationById("abc");

    expect(request.get).toHaveBeenCalledWith("/donor/donations/abc");
    expect(donation.foodName).toBe("Rice & Curry");
  });
});

/* ========================================================= */
/* WRITING: FORM STATE -> BACKEND PAYLOAD                     */
/* ========================================================= */

describe("createDonation", () => {
  it("posts the trimmed form to the donor route", async () => {
    request.post.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await createDonation(makeState());

    expect(request.post).toHaveBeenCalledTimes(1);

    const [url, payload] = request.post.mock.calls[0];

    expect(url).toBe("/donor/donations");
    expect(payload.foodType).toBe("Rice & Curry");
    expect(payload.foodCategory).toBe("Cooked meal");
    expect(payload.pickupAddress).toBe("12 Galle Road");
    expect(payload.pickupDistrict).toBe("Colombo");
    expect(payload.additionalDetails).toBe("Packaged in trays");
    expect(payload.aiReason).toBe("");
  });

  it("turns the date and time fields into real timestamps", async () => {
    request.post.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await createDonation(makeState());

    const [, payload] = request.post.mock.calls[0];

    expect(payload.preparationTime).toBe(local(2026, 10, 19, 10, 0));
    expect(payload.expiryTime).toBe(local(2026, 10, 19, 18, 0));
    expect(payload.pickupWindowStart).toBe(local(2026, 10, 19, 14, 0));
    expect(payload.pickupWindowEnd).toBe(local(2026, 10, 19, 17, 0));
  });

  it("keeps the availability window in step with the pickup window", async () => {
    request.post.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await createDonation(makeState());

    const [, payload] = request.post.mock.calls[0];

    expect(payload.availabilityStart).toBe(payload.pickupWindowStart);
    expect(payload.availabilityEnd).toBe(payload.pickupWindowEnd);
  });

  it("falls back to the preparation and expiry times when no pickup window was given", async () => {
    request.post.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await createDonation(
      makeState({
        pickupAvailableFromDate: "",
        pickupAvailableFromTime: "",
        pickupAvailableUntilDate: "",
        pickupAvailableUntilTime: "",
      }),
    );

    const [, payload] = request.post.mock.calls[0];

    expect(payload.availabilityStart).toBe(payload.preparationTime);
    expect(payload.availabilityEnd).toBe(payload.expiryTime);
  });

  it("sends numbers, not the strings the form holds", async () => {
    request.post.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await createDonation(makeState());

    const [, payload] = request.post.mock.calls[0];

    expect(payload.quantity).toBe(10);
    expect(payload.numberOfPortions).toBe(20);
    expect(payload.quantityUnit).toBe("kg");
    expect(payload.donationType).toBe("NORMAL");
    expect(payload.storageCondition).toBe("Room Temperature");
  });

  it("words the allergen answer the way the safety record reads", async () => {
    request.post.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    const answers: Array<[CreateDonationState["safety"]["allergens"], string]> = [
      ["YES", "Contains known allergens"],
      ["NOT_SURE", "Allergen information is not certain"],
      ["NO", "No known allergens reported"],
    ];

    for (const [answer, expected] of answers) {
      await createDonation(
        makeState({ safety: { ...makeState().safety, allergens: answer } }),
      );

      const [, payload] = request.post.mock.calls[
        request.post.mock.calls.length - 1
      ];

      expect(payload.allergenInfo).toBe(expected);
    }
  });

  it("words the packaging answer, and says nothing while it is unanswered", async () => {
    request.post.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await createDonation(
      makeState({ safety: { ...makeState().safety, packaging: "YES" } }),
    );

    expect(
      request.post.mock.calls[0][1].packagingCondition,
    ).toBe("Container reported clean and intact");

    await createDonation(
      makeState({ safety: { ...makeState().safety, packaging: "NO" } }),
    );

    expect(
      request.post.mock.calls[1][1].packagingCondition,
    ).toBe("Container reported as not clean or intact");

    await createDonation(
      makeState({ safety: { ...makeState().safety, packaging: null } }),
    );

    expect(request.post.mock.calls[2][1].packagingCondition).toBe("");
  });

  it("labels an empty category as Uncategorized rather than blank", async () => {
    request.post.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await createDonation(makeState({ category: "   " }));

    expect(request.post.mock.calls[0][1].foodCategory).toBe("Uncategorized");
  });

  it("carries the photo only when one was really taken, and keeps the jpeg default", async () => {
    request.post.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await createDonation(makeState());

    expect(request.post.mock.calls[0][1].photoBase64).toBeNull();
    expect(request.post.mock.calls[0][1].photoMimeType).toBe("image/jpeg");

    await createDonation(
      makeState({ photoBase64: "BASE64", photoMimeType: "image/png" }),
    );

    expect(request.post.mock.calls[1][1].photoBase64).toBe("BASE64");
    expect(request.post.mock.calls[1][1].photoMimeType).toBe("image/png");
  });

  it("returns the saved donation in the shape the screens read", async () => {
    request.post.mockResolvedValue({
      data: {
        success: true,
        data: makeLeanDonation({ foodName: undefined, category: undefined }),
      },
    });

    const donation: Donation = await createDonation(makeState());

    expect(donation.foodName).toBe("Rice & Curry");
    expect(donation.portions).toBe(24);
  });

  it.each([
    ["0", "20", "Quantity must be a positive number."],
    ["ten", "20", "Quantity must be a positive number."],
    ["10", "0", "Number of portions must be a positive number."],
  ])(
    "refuses quantity %s / portions %s before touching the network",
    async (quantity, portions, message) => {
      request.post.mockResolvedValue({
        data: { success: true, data: makeLeanDonation() },
      });

      await expect(
        createDonation(makeState({ quantity, portions })),
      ).rejects.toThrow(message);

      expect(request.post).not.toHaveBeenCalled();
    },
  );

  it("refuses an expiry that is not after preparation", async () => {
    await expect(
      createDonation(
        makeState({ preparationTime: "6:00 PM", expiryTime: "6:00 PM" }),
      ),
    ).rejects.toThrow("Expiry time must be after preparation time.");
  });

  it("refuses a pickup window that closes before it opens", async () => {
    await expect(
      createDonation(
        makeState({
          pickupAvailableFromTime: "5:00 PM",
          pickupAvailableUntilTime: "4:00 PM",
        }),
      ),
    ).rejects.toThrow("Pickup end time must be after pickup start time.");
  });

  it("refuses a clock time that does not exist", async () => {
    await expect(
      createDonation(makeState({ preparationTime: "13:00 PM" })),
    ).rejects.toThrow('Invalid time "13:00 PM".');
  });

  it("refuses a calendar date that does not exist instead of rolling it over", async () => {
    await expect(
      createDonation(makeState({ preparationDate: "2026-02-31" })),
    ).rejects.toThrow('Invalid date "2026-02-31".');
  });

  it("explains a time given without the format the parser expects", async () => {
    await expect(
      createDonation(makeState({ preparationTime: "nine" })),
    ).rejects.toThrow(
      'Invalid time "nine". Please use a format such as 10:00 AM.',
    );
  });

  it("insists on a time once a date has been picked", async () => {
    await expect(
      createDonation(makeState({ preparationTime: "" })),
    ).rejects.toThrow("Time is required.");
  });
});

/* ========================================================= */
/* EDITING: ONLY WHAT STAYS EDITABLE                          */
/* ========================================================= */

describe("updateDonation", () => {
  it("patches the donation route with the fields the donor changed", async () => {
    request.patch.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await updateDonation("abc", {
      foodType: "  Fish curry ",
      quantity: "4",
      portions: "12",
    });

    const [url, payload] = request.patch.mock.calls[0];

    expect(url).toBe("/donor/donations/abc");
    expect(payload.foodType).toBe("Fish curry");
    expect(payload.quantity).toBe(4);
    expect(payload.numberOfPortions).toBe(12);
  });

  it("leaves the locked safety, AI and photo fields out of the update", async () => {
    request.patch.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await updateDonation("abc", {
      foodType: "Fish curry",
      safety: {
        storage: "YES",
        temperature: "YES",
        handling: "YES",
        packaging: "YES",
        allergens: "YES",
      },
      aiResult: "APPROVED",
      aiReason: "should never be sent",
      storageCondition: "Frozen",
      allergenInfo: "should never be sent",
      packagingCondition: "should never be sent",
      photoUrl: "https://example.com/photo.jpg",
    } as never);

    const [, payload] = request.patch.mock.calls[0];

    expect(payload.foodType).toBe("Fish curry");
    expect(Object.keys(payload)).not.toContain("safety");
    expect(Object.keys(payload)).not.toContain("aiResult");
    expect(Object.keys(payload)).not.toContain("aiReason");
    expect(Object.keys(payload)).not.toContain("storageCondition");
    expect(Object.keys(payload)).not.toContain("allergenInfo");
    expect(Object.keys(payload)).not.toContain("packagingCondition");
    expect(Object.keys(payload)).not.toContain("photoUrl");
  });

  it("mirrors availabilityStart when only the pickup start changed", async () => {
    request.patch.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await updateDonation("abc", {
      pickupAvailableFromDate: "2026-10-20",
      pickupAvailableFromTime: "9:00 AM",
    });

    const [, payload] = request.patch.mock.calls[0];

    expect(payload.pickupWindowStart).toBe(local(2026, 10, 20, 9, 0));
    expect(payload.availabilityStart).toBe(payload.pickupWindowStart);
    expect(payload.pickupWindowEnd).toBeUndefined();
    expect(payload.availabilityEnd).toBeUndefined();
  });

  it("still calls a category Uncategorized when the donor clears it", async () => {
    request.patch.mockResolvedValue({
      data: { success: true, data: makeLeanDonation() },
    });

    await updateDonation("abc", { category: "   " });

    expect(request.patch.mock.calls[0][1].foodCategory).toBe("Uncategorized");
  });

  it("refuses fractional or empty portions on an edit", async () => {
    await expect(updateDonation("abc", { portions: "0" })).rejects.toThrow(
      "Number of portions must be a positive number.",
    );

    await expect(updateDonation("abc", { portions: "2.5" })).rejects.toThrow(
      "Number of portions must be a whole number.",
    );

    await expect(updateDonation("abc", { quantity: "-1" })).rejects.toThrow(
      "Quantity must be a positive number.",
    );

    expect(request.patch).not.toHaveBeenCalled();
  });

  it("refuses an edited expiry that falls before the edited preparation time", async () => {
    await expect(
      updateDonation("abc", {
        preparationDate: "2026-10-19",
        preparationTime: "8:00 PM",
        expiryDate: "2026-10-19",
        expiryTime: "7:00 PM",
      }),
    ).rejects.toThrow("Expiry time must be after preparation time.");
  });
});

describe("cancelDonation and deleteDonation", () => {
  it("cancels through the dedicated cancel route", async () => {
    request.patch.mockResolvedValue({
      data: { success: true, data: makeLeanDonation({ status: "cancelled" }) },
    });

    const donation = await cancelDonation("abc");

    expect(request.patch).toHaveBeenCalledWith("/donor/donations/abc/cancel");
    expect(donation.status).toBe("cancelled");
  });

  it("deletes without expecting a body back", async () => {
    request.delete.mockResolvedValue({ data: {} });

    await expect(deleteDonation("abc")).resolves.toBeUndefined();

    expect(request.delete).toHaveBeenCalledWith("/donor/donations/abc");
  });
});

/* ========================================================= */
/* EXPIRY ALERTS                                              */
/* ========================================================= */

describe("expiry alert readers", () => {
  it("asks for unread alerts with a limit when the bell wants them", async () => {
    request.get.mockResolvedValue({ data: { success: true, data: [] } });

    await getExpiryAlerts({ unreadOnly: true, limit: 20 });

    expect(request.get).toHaveBeenCalledWith("/donor/expiry-alerts", {
      params: { unread: "true", limit: 20 },
    });
  });

  it("sends no query when the donor wants the whole list", async () => {
    request.get.mockResolvedValue({ data: { success: true, data: [] } });

    await getExpiryAlerts();

    expect(request.get).toHaveBeenCalledWith("/donor/expiry-alerts", {
      params: {},
    });
  });

  it("reads a missing list as no alerts instead of crashing the bell", async () => {
    request.get.mockResolvedValue({ data: { success: true } });

    await expect(getExpiryAlerts()).resolves.toEqual([]);
  });

  it("reads a missing count as zero", async () => {
    request.get.mockResolvedValue({ data: { success: true } });

    await expect(getUnreadExpiryAlertCount()).resolves.toBe(0);

    request.get.mockResolvedValue({
      data: { success: true, data: { count: 4 } },
    });

    await expect(getUnreadExpiryAlertCount()).resolves.toBe(4);
  });
});
