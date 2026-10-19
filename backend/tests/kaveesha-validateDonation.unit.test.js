// backend/tests/kaveesha-validateDonation.unit.test.js
// Owner: Kaveesha
//
// Unit tests for the create-donation validator
// (src/middleware/kaveesha-validateDonation.js). The middleware is called with
// a plain fake request and a fake response, so the rules and the exact answer
// the donor app receives are checked without Express, Mongo or the network.

const {
  validateDonationPayload,
} = require('../src/middleware/kaveesha-validateDonation');

function validBody(overrides = {}) {
  return {
    donationType: 'NORMAL',
    foodType: 'Rice & Curry',
    foodCategory: 'Cooked meal',

    quantity: 10,
    quantityUnit: 'kg',
    numberOfPortions: 30,

    preparationTime: '2026-10-19T09:00:00.000Z',
    expiryTime: '2026-10-19T18:00:00.000Z',

    availabilityStart: '2026-10-19T10:00:00.000Z',
    availabilityEnd: '2026-10-19T17:00:00.000Z',

    storageCondition: 'Room Temperature',

    pickupAddress: '12 Galle Road, Colombo',
    pickupDistrict: 'Colombo',
    pickupWindowStart: '2026-10-19T14:00:00.000Z',
    pickupWindowEnd: '2026-10-19T16:00:00.000Z',

    aiResult: 'PENDING',
    aiReason: '',

    safety: {
      storage: 'YES',
      temperature: 'NOT_SURE',
      handling: 'YES',
      packaging: 'YES',
      allergens: 'NO',
    },

    ...overrides,
  };
}

function run(body) {
  const req = { body };

  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);

  const next = jest.fn();

  validateDonationPayload(req, res, next);

  const rejected = res.status.mock.calls.length > 0;

  return {
    next,
    rejected,
    statusCode: rejected ? res.status.mock.calls[0][0] : undefined,
    body: rejected ? res.json.mock.calls[0][0] : undefined,
    errors: rejected ? res.json.mock.calls[0][0].errors : {},
  };
}

function errorFor(overrides) {
  return run(validBody(overrides)).errors;
}

describe('validateDonationPayload - a donation the donor app really sends', () => {
  it('lets a complete payload through to the route', () => {
    const result = run(validBody());

    expect(result.rejected).toBe(false);
    expect(result.next).toHaveBeenCalledTimes(1);
  });

  it('answers with the shape the app reads on failure', () => {
    const result = run({});

    expect(result.statusCode).toBe(400);
    expect(result.body.success).toBe(false);
    expect(result.body.message).toBe('Validation failed');
    expect(result.body.errors).toEqual(expect.any(Object));
    expect(result.next).not.toHaveBeenCalled();
  });

  it('does not crash when there is no body at all', () => {
    expect(() => run(undefined)).not.toThrow();
    expect(run(undefined).rejected).toBe(true);
  });
});

describe('validateDonationPayload - food information', () => {
  it('requires a food type that is not only spaces', () => {
    expect(errorFor({ foodType: undefined }).foodType).toBe(
      'Food type is required',
    );

    expect(errorFor({ foodType: '   ' }).foodType).toBe(
      'Food type is required',
    );
  });

  it('caps the food type at 120 characters', () => {
    expect(errorFor({ foodType: 'x'.repeat(121) }).foodType).toBe(
      'Food type cannot exceed 120 characters',
    );

    expect(errorFor({ foodType: 'x'.repeat(120) }).foodType).toBeUndefined();
  });

  it('caps the category at 100 characters but never demands one', () => {
    expect(errorFor({ foodCategory: undefined }).foodCategory).toBeUndefined();
    expect(errorFor({ foodCategory: '' }).foodCategory).toBeUndefined();

    expect(errorFor({ foodCategory: 'x'.repeat(101) }).foodCategory).toBe(
      'Food category cannot exceed 100 characters',
    );
  });

  it('accepts a quantity given as text, because forms send strings', () => {
    expect(errorFor({ quantity: '10' }).quantity).toBeUndefined();
    expect(errorFor({ quantity: '0.5' }).quantity).toBeUndefined();
  });

  it('refuses a quantity that is missing, zero, negative or not a number', () => {
    const message = 'Quantity must be a positive number';

    expect(errorFor({ quantity: undefined }).quantity).toBe(message);
    expect(errorFor({ quantity: 0 }).quantity).toBe(message);
    expect(errorFor({ quantity: -5 }).quantity).toBe(message);
    expect(errorFor({ quantity: 'ten' }).quantity).toBe(message);
  });

  it('refuses portions that are not whole meals', () => {
    expect(errorFor({ numberOfPortions: 0 }).numberOfPortions).toBe(
      'Number of portions must be a positive number',
    );

    expect(errorFor({ numberOfPortions: 2.5 }).numberOfPortions).toBe(
      'Number of portions must be a whole number',
    );
  });

  it('only accepts the units the app offers', () => {
    expect(errorFor({ quantityUnit: undefined }).quantityUnit).toBeUndefined();
    expect(errorFor({ quantityUnit: 'boxes' }).quantityUnit).toBeUndefined();

    expect(errorFor({ quantityUnit: 'litres' }).quantityUnit).toBe(
      'Invalid quantity unit',
    );
  });

  it('only accepts NORMAL or URGENT', () => {
    expect(errorFor({ donationType: undefined }).donationType).toBeUndefined();
    expect(errorFor({ donationType: 'URGENT' }).donationType).toBeUndefined();

    expect(errorFor({ donationType: 'FLASH' }).donationType).toBe(
      'Invalid donation type',
    );
  });
});

describe('validateDonationPayload - timing', () => {
  it('requires a readable preparation time', () => {
    expect(errorFor({ preparationTime: undefined }).preparationTime).toBe(
      'A valid preparation date and time is required',
    );

    expect(errorFor({ preparationTime: 'whenever' }).preparationTime).toBe(
      'A valid preparation date and time is required',
    );
  });

  it('refuses an expiry that is not after preparation', () => {
    expect(
      errorFor({
        preparationTime: '2026-10-19T18:00:00.000Z',
        expiryTime: '2026-10-19T18:00:00.000Z',
      }).expiryTime,
    ).toBe('Expiry time must be after preparation time');

    expect(
      errorFor({
        preparationTime: '2026-10-19T18:00:00.000Z',
        expiryTime: '2026-10-19T17:00:00.000Z',
      }).expiryTime,
    ).toBe('Expiry time must be after preparation time');
  });

  it('requires the rescue window on both sides', () => {
    const errors = errorFor({
      availabilityStart: undefined,
      availabilityEnd: undefined,
    });

    expect(errors.availabilityStart).toBe(
      'A valid availability start is required',
    );

    expect(errors.availabilityEnd).toBe(
      'A valid availability end is required',
    );
  });

  it('refuses a rescue window that closes before it opens', () => {
    expect(
      errorFor({
        availabilityStart: '2026-10-19T17:00:00.000Z',
        availabilityEnd: '2026-10-19T16:00:00.000Z',
      }).availabilityEnd,
    ).toBe('Availability end must be after availability start');
  });

  it('refuses to keep a donation listed after the food has expired', () => {
    expect(
      errorFor({ availabilityEnd: '2026-10-19T19:00:00.000Z' }).availabilityEnd,
    ).toBe('Availability end cannot be after the food expiry time');
  });
});

describe('validateDonationPayload - pickup', () => {
  it('needs an address a rescuer can drive to', () => {
    expect(errorFor({ pickupAddress: '' }).pickupAddress).toBe(
      'Pickup address is required',
    );

    expect(errorFor({ pickupAddress: '   ' }).pickupAddress).toBe(
      'Pickup address is required',
    );

    expect(errorFor({ pickupAddress: 'x'.repeat(301) }).pickupAddress).toBe(
      'Pickup address cannot exceed 300 characters',
    );
  });

  it('needs a district', () => {
    expect(errorFor({ pickupDistrict: '' }).pickupDistrict).toBe(
      'Pickup district is required',
    );

    expect(errorFor({ pickupDistrict: 'x'.repeat(101) }).pickupDistrict).toBe(
      'Pickup district cannot exceed 100 characters',
    );
  });

  it('requires the pickup window, not just the address', () => {
    const errors = errorFor({
      pickupWindowStart: undefined,
      pickupWindowEnd: undefined,
    });

    expect(errors.pickupWindowStart).toBe(
      'A valid pickup start date and time is required',
    );

    expect(errors.pickupWindowEnd).toBe(
      'A valid pickup end date and time is required',
    );
  });

  it('refuses a pickup window that closes before it opens', () => {
    expect(
      errorFor({
        pickupWindowStart: '2026-10-19T16:00:00.000Z',
        pickupWindowEnd: '2026-10-19T16:00:00.000Z',
      }).pickupWindowEnd,
    ).toBe('Pickup end must be after pickup start');
  });

  it('keeps the pickup inside the rescue window', () => {
    expect(
      errorFor({ pickupWindowStart: '2026-10-19T09:30:00.000Z' })
        .pickupWindowStart,
    ).toBe('Pickup start cannot be before donation availability starts');

    expect(
      errorFor({ pickupWindowEnd: '2026-10-19T17:30:00.000Z' }).pickupWindowEnd,
    ).toBe('Pickup end cannot be after donation availability ends');
  });

  it('keeps the pickup before the food expires', () => {
    expect(
      errorFor({
        pickupWindowEnd: '2026-10-19T18:30:00.000Z',
        availabilityEnd: '2026-10-19T19:00:00.000Z',
      }).pickupWindowEnd,
    ).toBe('Pickup end cannot be after the food expiry time');
  });
});

describe('validateDonationPayload - optional text', () => {
  it('caps each free-text field at the length the detail page can show', () => {
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

  it('leaves them alone when the donor wrote nothing', () => {
    const errors = errorFor({
      allergenInfo: '',
      packagingCondition: '',
      additionalDetails: '',
    });

    expect(errors.allergenInfo).toBeUndefined();
    expect(errors.packagingCondition).toBeUndefined();
    expect(errors.additionalDetails).toBeUndefined();
  });

  it('validates the screening fields it accepts', () => {
    expect(errorFor({ storageCondition: 'On the counter' }).storageCondition).toBe(
      'Invalid storage condition',
    );

    expect(errorFor({ aiResult: 'REJECTED' }).aiResult).toBe(
      'Invalid AI screening result',
    );

    expect(errorFor({ aiReason: 'x'.repeat(501) }).aiReason).toBe(
      'AI screening reason cannot exceed 500 characters',
    );
  });
});

describe('validateDonationPayload - safety assessment', () => {
  it('demands the checklist before anything is published', () => {
    expect(errorFor({ safety: undefined }).safety).toBe(
      'Safety assessment is required',
    );

    expect(errorFor({ safety: 'YES' }).safety).toBe(
      'Safety assessment is required',
    );

    expect(errorFor({ safety: [] }).safety).toBe(
      'Safety assessment is required',
    );
  });

  it('names the question the donor skipped', () => {
    const errors = errorFor({
      safety: {
        storage: null,
        temperature: null,
        handling: null,
        packaging: null,
        allergens: null,
      },
    });

    expect(errors['safety.storage']).toBe('Storage safety answer is required');
    expect(errors['safety.temperature']).toBe(
      'Temperature safety answer is required',
    );
    expect(errors['safety.handling']).toBe('Handling safety answer is required');
    expect(errors['safety.packaging']).toBe(
      'Packaging safety answer is required',
    );
    expect(errors['safety.allergens']).toBe(
      'Allergen safety answer is required',
    );
  });

  it('blocks food that was not stored appropriately', () => {
    const errors = errorFor({
      safety: { ...validBody().safety, storage: 'NO' },
    });

    expect(errors.safety).toBe(
      'Donation cannot be posted because the food was not reported as stored appropriately',
    );
  });

  it('blocks food that was not handled hygienically', () => {
    const errors = errorFor({
      safety: { ...validBody().safety, handling: 'NO' },
    });

    expect(errors.safety).toBe(
      'Donation cannot be posted because the food was not reported as handled hygienically',
    );
  });

  it('blocks food in a container that is not clean and intact', () => {
    const errors = errorFor({
      safety: { ...validBody().safety, packaging: 'NO' },
    });

    expect(errors.safety).toBe(
      'Donation cannot be posted because the food container was not reported as clean and intact',
    );
  });

  it('allows an honest not-sure about temperature or allergens', () => {
    expect(
      errorFor({
        safety: { ...validBody().safety, temperature: 'NOT_SURE' },
      }).safety,
    ).toBeUndefined();

    expect(
      errorFor({
        safety: { ...validBody().safety, allergens: 'NOT_SURE' },
      }).safety,
    ).toBeUndefined();
  });

  it('refuses not-sure on the answers that must be definite', () => {
    const errors = errorFor({
      safety: { ...validBody().safety, storage: 'NOT_SURE' },
    });

    expect(errors['safety.storage']).toBe('Storage safety answer is required');
  });

  it('reports every broken rule at once, so the donor fixes the form in one go', () => {
    const errors = errorFor({
      foodType: '',
      quantity: 0,
      numberOfPortions: 2.5,
      pickupAddress: '',
      safety: { ...validBody().safety, storage: 'NO', handling: null },
    });

    expect(Object.keys(errors)).toEqual(expect.arrayContaining([
      'foodType',
      'quantity',
      'numberOfPortions',
      'pickupAddress',
      'safety',
      'safety.handling',
    ]));
  });
});
