// frontend/tests/kaveesha-donationValidation.unit.test.ts
// Owner: Kaveesha
//
// Unit tests for the Create Donation form rules
// (src/screens/kaveesha-donationValidation.ts). These messages are what the
// donor reads when a field is wrong, so both the rule and the exact wording
// are pinned here.

import type {
  DonationFormValues,
  DonationTypeOption,
} from "../src/types/kaveesha-donation.types";

import {
  emptyDonationForm,
} from "../src/types/kaveesha-donation.types";

import {
  isFormValid,
  validateDonationForm,
} from "../src/screens/kaveesha-donationValidation";

/* A form filled exactly the way the flow lets a donor fill it. */
function validValues(
  overrides: Partial<DonationFormValues> = {},
): DonationFormValues {
  return {
    ...emptyDonationForm,

    donationType: "NORMAL",
    foodType: "Rice & Curry",
    category: "Cooked meal",

    quantity: "10",
    portions: "20",

    preparationDate: "2026-10-19",
    preparationTime: "10:00 AM",

    expiryDate: "2026-10-19",
    expiryTime: "6:00 PM",

    pickupLocation: "12 Galle Road, Colombo",
    pickupDistrict: "Colombo",

    pickupAvailableFromDate: "2026-10-19",
    pickupAvailableFromTime: "2:00 PM",

    pickupAvailableUntilDate: "2026-10-19",
    pickupAvailableUntilTime: "5:00 PM",

    ...overrides,
  };
}

describe("validateDonationForm - a complete form", () => {
  it("accepts it with no errors at all", () => {
    expect(validateDonationForm(validValues())).toEqual({});
    expect(isFormValid(validateDonationForm(validValues()))).toBe(true);
  });

  it("accepts the 24 hour clock and a same-minute-later pickup window", () => {
    expect(
      validateDonationForm(
        validValues({
          preparationTime: "17:30",
          expiryDate: "2026-10-20",
          expiryTime: "0:15",
          pickupAvailableFromTime: "17:45",
          pickupAvailableUntilDate: "2026-10-20",
          pickupAvailableUntilTime: "18:00",
        }),
      ),
    ).toEqual({});
  });

  it("accepts an empty note and a long one up to 500 characters", () => {
    expect(validateDonationForm(validValues({ additionalDetails: "" }))).toEqual({});
    expect(
      validateDonationForm(
        validValues({ additionalDetails: "a".repeat(500) }),
      ),
    ).toEqual({});
  });
});

describe("validateDonationForm - donation type", () => {
  it("asks the donor to choose between a normal and an urgent post", () => {
    expect(
      validateDonationForm(
        validValues({
          donationType: "" as unknown as DonationTypeOption,
        }),
      ).donationType,
    ).toBe("Please select a donation type");

    expect(
      validateDonationForm(validValues({ donationType: "URGENT" })).donationType,
    ).toBeUndefined();
  });
});

describe("validateDonationForm - food information", () => {
  it("requires a food type and trims alone are not enough", () => {
    expect(validateDonationForm(validValues({ foodType: "" })).foodType).toBe(
      "Food type is required",
    );

    expect(validateDonationForm(validValues({ foodType: "   " })).foodType).toBe(
      "Food type is required",
    );
  });

  it("wants at least two real characters", () => {
    expect(validateDonationForm(validValues({ foodType: "R" })).foodType).toBe(
      "Food type must contain at least 2 characters",
    );

    expect(
      validateDonationForm(validValues({ foodType: "  R  " })).foodType,
    ).toBe("Food type must contain at least 2 characters");
  });

  it("stops a food type longer than 100 characters", () => {
    expect(
      validateDonationForm(validValues({ foodType: "R".repeat(101) })).foodType,
    ).toBe("Food type cannot exceed 100 characters");

    expect(
      validateDonationForm(validValues({ foodType: "R".repeat(100) })).foodType,
    ).toBeUndefined();
  });

  it("requires a category", () => {
    expect(validateDonationForm(validValues({ category: "" })).category).toBe(
      "Food category is required",
    );
  });

  it("requires a quantity and reads it as a number", () => {
    expect(validateDonationForm(validValues({ quantity: "" })).quantity).toBe(
      "Quantity is required",
    );

    expect(validateDonationForm(validValues({ quantity: "abc" })).quantity).toBe(
      "Quantity must be a valid number",
    );

    expect(validateDonationForm(validValues({ quantity: "0" })).quantity).toBe(
      "Quantity must be greater than 0",
    );

    expect(validateDonationForm(validValues({ quantity: "-2" })).quantity).toBe(
      "Quantity must be greater than 0",
    );

    /* Fractions are fine - half a kilo is a real amount of food. */
    expect(validateDonationForm(validValues({ quantity: "0.5" })).quantity).toBeUndefined();
  });

  it("wants whole portions that exist", () => {
    expect(validateDonationForm(validValues({ portions: "" })).portions).toBe(
      "Number of portions is required",
    );

    expect(validateDonationForm(validValues({ portions: "two" })).portions).toBe(
      "Number of portions must be a valid number",
    );

    expect(validateDonationForm(validValues({ portions: "0" })).portions).toBe(
      "Number of portions must be greater than 0",
    );

    expect(validateDonationForm(validValues({ portions: "4.5" })).portions).toBe(
      "Number of portions must be a whole number",
    );

    expect(validateDonationForm(validValues({ portions: "12" })).portions).toBeUndefined();
  });
});

describe("validateDonationForm - preparation and expiry", () => {
  it("requires both halves of the preparation moment", () => {
    const errors = validateDonationForm(
      validValues({ preparationDate: "", preparationTime: "" }),
    );

    expect(errors.preparationDate).toBe("Preparation date is required");
    expect(errors.preparationTime).toBe("Preparation time is required");
  });

  it("rejects a date that is not YYYY-MM-DD or not a real day", () => {
    expect(
      validateDonationForm(validValues({ preparationDate: "19-10-2026" }))
        .preparationDate,
    ).toBe("Use the format YYYY-MM-DD");

    /* The calendar check, not just the shape. */
    expect(
      validateDonationForm(validValues({ preparationDate: "2026-02-31" }))
        .preparationDate,
    ).toBe("Use the format YYYY-MM-DD");

    expect(
      validateDonationForm(validValues({ preparationDate: "2026-13-01" }))
        .preparationDate,
    ).toBe("Use the format YYYY-MM-DD");
  });

  it("rejects times that cannot exist", () => {
    expect(
      validateDonationForm(validValues({ preparationTime: "13:00 PM" }))
        .preparationTime,
    ).toBe("Enter a valid time, e.g. 10:00 AM");

    expect(
      validateDonationForm(validValues({ preparationTime: "25:00" }))
        .preparationTime,
    ).toBe("Enter a valid time, e.g. 10:00 AM");

    expect(
      validateDonationForm(validValues({ preparationTime: "10:75" }))
        .preparationTime,
    ).toBe("Enter a valid time, e.g. 10:00 AM");

    expect(
      validateDonationForm(validValues({ preparationTime: "half past nine" }))
        .preparationTime,
    ).toBe("Enter a valid time, e.g. 10:00 AM");
  });

  it("requires both halves of the expiry moment and explains the clock format", () => {
    const errors = validateDonationForm(
      validValues({ expiryDate: "", expiryTime: "" }),
    );

    expect(errors.expiryDate).toBe("Expiry date is required");
    expect(errors.expiryTime).toBe("Expiry time is required");

    expect(
      validateDonationForm(validValues({ expiryTime: "nope" })).expiryTime,
    ).toBe("Enter a valid time, e.g. 8:00 PM");
  });

  it("refuses an expiry at or before the preparation time", () => {
    expect(
      validateDonationForm(
        validValues({ preparationTime: "10:00 AM", expiryTime: "10:00 AM" }),
      ).expiryDate,
    ).toBe("Expiry must be after preparation date and time");

    expect(
      validateDonationForm(
        validValues({
          preparationDate: "2026-10-19",
          expiryDate: "2026-10-18",
        }),
      ).expiryDate,
    ).toBe("Expiry must be after preparation date and time");

    expect(
      validateDonationForm(
        validValues({ preparationTime: "10:00 AM", expiryTime: "10:01 AM" }),
      ).expiryDate,
    ).toBeUndefined();
  });

  it("does not compare anything while the dates themselves are broken", () => {
    const errors = validateDonationForm(
      validValues({ expiryDate: "2026-02-31", preparationDate: "bad" }),
    );

    expect(errors.expiryDate).toBe("Use the format YYYY-MM-DD");
    expect(errors.preparationDate).toBe("Use the format YYYY-MM-DD");
  });
});

describe("validateDonationForm - pickup information", () => {
  it("wants an address a rescuer can actually find", () => {
    expect(
      validateDonationForm(validValues({ pickupLocation: "" })).pickupLocation,
    ).toBe("Pickup address is required");

    expect(
      validateDonationForm(validValues({ pickupLocation: "5/A" })).pickupLocation,
    ).toBe("Please provide a more complete pickup address");
  });

  it("wants a district", () => {
    expect(
      validateDonationForm(validValues({ pickupDistrict: "" })).pickupDistrict,
    ).toBe("Pickup district is required");

    expect(
      validateDonationForm(validValues({ pickupDistrict: "C" })).pickupDistrict,
    ).toBe("Please enter a valid district");
  });

  it("requires the pickup window on both sides", () => {
    const errors = validateDonationForm(
      validValues({
        pickupAvailableFromDate: "",
        pickupAvailableFromTime: "",
        pickupAvailableUntilDate: "",
        pickupAvailableUntilTime: "",
      }),
    );

    expect(errors.pickupAvailableFromDate).toBe("Pickup start date is required");
    expect(errors.pickupAvailableFromTime).toBe("Pickup start time is required");
    expect(errors.pickupAvailableUntilDate).toBe("Pickup end date is required");
    expect(errors.pickupAvailableUntilTime).toBe("Pickup end time is required");
  });

  it("checks the shape of the pickup dates and the realism of the pickup times", () => {
    expect(
      validateDonationForm(
        validValues({ pickupAvailableFromDate: "2026/10/19" }),
      ).pickupAvailableFromDate,
    ).toBe("Use the format YYYY-MM-DD");

    expect(
      validateDonationForm(
        validValues({ pickupAvailableFromTime: "9 o clock" }),
      ).pickupAvailableFromTime,
    ).toBe("Enter a valid time, e.g. 5:00 PM");

    expect(
      validateDonationForm(
        validValues({ pickupAvailableUntilDate: "next tuesday" }),
      ).pickupAvailableUntilDate,
    ).toBe("Use the format YYYY-MM-DD");

    expect(
      validateDonationForm(
        validValues({ pickupAvailableUntilTime: "12:30" , pickupAvailableUntilDate: "2026-10-20" }),
      ).pickupAvailableUntilTime,
    ).toBeUndefined();
  });

  it("refuses a pickup window that closes before it opens", () => {
    expect(
      validateDonationForm(
        validValues({
          pickupAvailableFromTime: "5:00 PM",
          pickupAvailableUntilTime: "5:00 PM",
        }),
      ).pickupAvailableUntilDate,
    ).toBe("Pickup end must be after pickup start");

    expect(
      validateDonationForm(
        validValues({
          pickupAvailableFromTime: "4:00 PM",
          pickupAvailableUntilTime: "3:00 PM",
        }),
      ).pickupAvailableUntilDate,
    ).toBe("Pickup end must be after pickup start");

    expect(
      validateDonationForm(
        validValues({
          pickupAvailableFromTime: "2:00 PM",
          pickupAvailableUntilTime: "2:01 PM",
        }),
      ).pickupAvailableUntilDate,
    ).toBeUndefined();
  });

  it("leaves the window alone when one side is unreadable", () => {
    const errors = validateDonationForm(
      validValues({ pickupAvailableFromDate: "2026-02-30" }),
    );

    expect(errors.pickupAvailableUntilDate).toBeUndefined();
  });
});

describe("validateDonationForm - additional details", () => {
  it("keeps a note inside 500 characters", () => {
    expect(
      validateDonationForm(
        validValues({ additionalDetails: "a".repeat(501) }),
      ).additionalDetails,
    ).toBe("Additional details cannot exceed 500 characters");

    /* Spaces alone do not count towards the limit. */
    expect(
      validateDonationForm(
        validValues({ additionalDetails: `${"a".repeat(498)}   ` }),
      ).additionalDetails,
    ).toBeUndefined();
  });
});

describe("validateDonationForm - reporting", () => {
  it("reports every broken field at once instead of one at a time", () => {
    const errors = validateDonationForm(
      validValues({
        foodType: "",
        category: "",
        quantity: "0",
        portions: "1.5",
        pickupDistrict: "",
      }),
    );

    expect(Object.keys(errors).sort()).toEqual(
      ["category", "foodType", "pickupDistrict", "portions", "quantity"],
    );
  });

  it("reads an empty error object as a form that may be submitted", () => {
    expect(isFormValid({})).toBe(true);
    expect(isFormValid({ foodType: "Food type is required" })).toBe(false);
  });
});
