// backend/tests/kaveesha-validateDonationUpdate.unit.test.js
// Owner: Kaveesha
//
// Unit tests for the edit-donation validator
// (src/middleware/kaveesha-validateDonationUpdate.js). An edit only carries
// the fields the donor touched, so the rules are "validate when present",
// plus the fields that must never change after posting.

const {
  validateDonationUpdatePayload,
} = require('../src/middleware/kaveesha-validateDonationUpdate');

function run(body) {
  const req = { body };

  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  const next = jest.fn();

  validateDonationUpdatePayload(req, res, next);

  const rejected = res.status.mock.calls.length > 0;

  return {
    next,
    rejected,
    statusCode: rejected ? res.status.mock.calls[0][0] : undefined,
    payload: rejected ? res.json.mock.calls[0][0] : undefined,
    errors: rejected ? res.json.mock.calls[0][0].errors : {},
  };
}

function errorFor(body) {
  return run(body).errors;
}

describe('validateDonationUpdatePayload - partial edits', () => {
  it('accepts an empty body, because nothing is being changed', () => {
    const result = run({});

    expect(result.rejected).toBe(false);
    expect(result.next).toHaveBeenCalledTimes(1);
  });

  it('accepts a single changed field', () => {
    expect(run({ numberOfPortions: 24 }).rejected).toBe(false);
    expect(run({ foodType: 'Fish curry' }).rejected).toBe(false);
  });

  it('does not crash when there is no body at all', () => {
    expect(() => run(undefined)).not.toThrow();
    expect(run(undefined).rejected).toBe(false);
  });

  it('answers with the same failure shape as the create validator', () => {
    const result = run({ quantity: 0 });

    expect(result.statusCode).toBe(400);
    expect(result.payload).toEqual({
      success: false,
      message: 'Validation failed',
      errors: { quantity: 'Quantity must be a positive number' },
    });
    expect(result.next).not.toHaveBeenCalled();
  });
});

describe('validateDonationUpdatePayload - field rules', () => {
  it('refuses an empty or oversized food type', () => {
    expect(errorFor({ foodType: '   ' }).foodType).toBe(
      'Food type cannot be empty',
    );

    expect(errorFor({ foodType: 'x'.repeat(121) }).foodType).toBe(
      'Food type cannot exceed 120 characters',
    );
  });

  it('refuses an oversized category', () => {
    expect(errorFor({ foodCategory: 'x'.repeat(101) }).foodCategory).toBe(
      'Food category cannot exceed 100 characters',
    );

    /* Clearing a category is allowed on an edit. */
    expect(errorFor({ foodCategory: '' }).foodCategory).toBeUndefined();
  });

  it('refuses amounts that cannot be rescued', () => {
    expect(errorFor({ quantity: 0 }).quantity).toBe(
      'Quantity must be a positive number',
    );

    expect(errorFor({ quantity: 'abc' }).quantity).toBe(
      'Quantity must be a positive number',
    );

    expect(errorFor({ quantity: '4' }).quantity).toBeUndefined();

    expect(errorFor({ numberOfPortions: 0 }).numberOfPortions).toBe(
      'Number of portions must be a positive number',
    );

    expect(errorFor({ numberOfPortions: 3.5 }).numberOfPortions).toBe(
      'Number of portions must be a whole number',
    );
  });

  it('refuses invented units, types and storage conditions', () => {
    expect(errorFor({ quantityUnit: 'litres' }).quantityUnit).toBe(
      'Invalid quantity unit',
    );

    expect(errorFor({ donationType: 'FLASH' }).donationType).toBe(
      'Invalid donation type',
    );

    expect(errorFor({ storageCondition: 'On the counter' }).storageCondition).toBe(
      'Invalid storage condition',
    );
  });

  it('checks the timing only between the fields the edit actually carries', () => {
    expect(
      errorFor({
        preparationTime: '2026-10-19T18:00:00.000Z',
        expiryTime: '2026-10-19T17:00:00.000Z',
      }).expiryTime,
    ).toBe('Expiry time must be after preparation time');

    /* One side alone cannot be compared, so the saved value stays trusted. */
    expect(errorFor({ expiryTime: '2026-10-18T08:00:00.000Z' }).expiryTime).toBeUndefined();

    expect(errorFor({ preparationTime: 'whenever' }).preparationTime).toBe(
      'A valid preparation date and time is required',
    );
  });

  it('keeps a shortened rescue window honest', () => {
    expect(
      errorFor({
        availabilityStart: '2026-10-19T17:00:00.000Z',
        availabilityEnd: '2026-10-19T16:00:00.000Z',
      }).availabilityEnd,
    ).toBe('Availability end must be after availability start');

    expect(
      errorFor({
        availabilityEnd: '2026-10-19T20:00:00.000Z',
        expiryTime: '2026-10-19T18:00:00.000Z',
        preparationTime: '2026-10-19T09:00:00.000Z',
      }).availabilityEnd,
    ).toBe('Availability end cannot be after the food expiry time');
  });

  it('keeps a moved pickup window inside the rescue window and before expiry', () => {
    expect(
      errorFor({
        pickupWindowStart: '2026-10-19T16:00:00.000Z',
        pickupWindowEnd: '2026-10-19T15:00:00.000Z',
      }).pickupWindowEnd,
    ).toBe('Pickup end must be after pickup start');

    expect(
      errorFor({
        pickupWindowStart: '2026-10-19T09:00:00.000Z',
        availabilityStart: '2026-10-19T10:00:00.000Z',
      }).pickupWindowStart,
    ).toBe('Pickup start cannot be before donation availability starts');

    expect(
      errorFor({
        pickupWindowEnd: '2026-10-19T18:00:00.000Z',
        availabilityEnd: '2026-10-19T17:00:00.000Z',
      }).pickupWindowEnd,
    ).toBe('Pickup end cannot be after donation availability ends');

    expect(
      errorFor({
        pickupWindowEnd: '2026-10-19T18:30:00.000Z',
        availabilityEnd: '2026-10-19T19:00:00.000Z',
        expiryTime: '2026-10-19T18:00:00.000Z',
        preparationTime: '2026-10-19T09:00:00.000Z',
      }).pickupWindowEnd,
    ).toBe('Pickup end cannot be after the food expiry time');
  });

  it('refuses an empty or oversized pickup address and district', () => {
    expect(errorFor({ pickupAddress: '  ' }).pickupAddress).toBe(
      'Pickup address cannot be empty',
    );

    expect(errorFor({ pickupAddress: 'x'.repeat(301) }).pickupAddress).toBe(
      'Pickup address cannot exceed 300 characters',
    );

    expect(errorFor({ pickupDistrict: '' }).pickupDistrict).toBe(
      'Pickup district cannot be empty',
    );

    expect(errorFor({ pickupDistrict: 'x'.repeat(101) }).pickupDistrict).toBe(
      'Pickup district cannot exceed 100 characters',
    );
  });

  it('caps the free-text fields it does accept', () => {
    expect(errorFor({ allergenInfo: 'x'.repeat(301) }).allergenInfo).toBe(
      'Allergen information cannot exceed 300 characters',
    );

    expect(
      errorFor({ packagingCondition: 'x'.repeat(201) }).packagingCondition,
    ).toBe('Packaging condition cannot exceed 200 characters');

    expect(
      errorFor({ additionalDetails: 'x'.repeat(1001) }).additionalDetails,
    ).toBe('Additional details cannot exceed 1000 characters');
  });
});

describe('validateDonationUpdatePayload - what stays locked after posting', () => {
  it('rejects any attempt to rewrite the safety assessment', () => {
    expect(
      errorFor({
        safety: {
          storage: 'YES',
          temperature: 'YES',
          handling: 'YES',
          packaging: 'YES',
          allergens: 'YES',
        },
      }).safety,
    ).toBe('Safety assessment cannot be changed after the donation is posted');
  });

  it('rejects an attempt to clear the safety assessment as well', () => {
    expect(errorFor({ safety: null }).safety).toBe(
      'Safety assessment cannot be changed after the donation is posted',
    );
  });

  it('rejects an edited AI screening result', () => {
    expect(errorFor({ aiResult: 'GOOD' }).aiResult).toBe(
      'AI screening result cannot be changed through donation editing',
    );
  });

  it('rejects an edited AI screening reason', () => {
    expect(errorFor({ aiReason: 'looks fine now' }).aiReason).toBe(
      'AI screening information cannot be changed through donation editing',
    );
  });

  it('still lets the donor edit everything that is theirs to edit', () => {
    const result = run({
      donationType: 'URGENT',
      foodType: 'Fish curry',
      foodCategory: 'Cooked meal',
      quantity: 4,
      quantityUnit: 'boxes',
      numberOfPortions: 12,
      preparationTime: '2026-10-19T09:00:00.000Z',
      expiryTime: '2026-10-19T18:00:00.000Z',
      availabilityStart: '2026-10-19T10:00:00.000Z',
      availabilityEnd: '2026-10-19T17:00:00.000Z',
      pickupAddress: '48 Lake Road, Colombo',
      pickupDistrict: 'Colombo',
      pickupWindowStart: '2026-10-19T14:00:00.000Z',
      pickupWindowEnd: '2026-10-19T16:00:00.000Z',
      additionalDetails: 'Please call on arrival',
    });

    expect(result.rejected).toBe(false);
    expect(result.next).toHaveBeenCalledTimes(1);
  });
});
