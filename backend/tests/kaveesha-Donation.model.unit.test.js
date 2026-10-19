// backend/tests/kaveesha-Donation.model.unit.test.js
// Owner: Kaveesha
//
// Unit tests for the Donation schema (src/models/kaveesha-Donation.js).
// Mongoose runs the schema validators without any database connection, so
// these checks cover the rules that protect the collection itself,
// independently of the route validators.

const mongoose = require('mongoose');

const Donation = require('../src/models/kaveesha-Donation');

function validDoc(overrides = {}) {
  return {
    donor: new mongoose.Types.ObjectId(),
    foodType: 'Rice & Curry',
    foodCategory: 'Cooked meal',
    quantity: 10,
    quantityUnit: 'kg',
    numberOfPortions: 30,
    preparationTime: new Date('2026-10-19T09:00:00.000Z'),
    expiryTime: new Date('2026-10-19T18:00:00.000Z'),
    availabilityStart: new Date('2026-10-19T10:00:00.000Z'),
    availabilityEnd: new Date('2026-10-19T17:00:00.000Z'),
    storageCondition: 'Room Temperature',
    pickupAddress: '12 Galle Road, Colombo',
    pickupDistrict: 'Colombo',
    pickupWindowStart: new Date('2026-10-19T14:00:00.000Z'),
    pickupWindowEnd: new Date('2026-10-19T16:00:00.000Z'),
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

/* Resolves with the ValidationError, or undefined when the document is fine. */
async function errorOf(overrides) {
  try {
    await new Donation(validDoc(overrides)).validate();

    return undefined;
  } catch (error) {
    return error;
  }
}

async function expectAccepted(overrides = {}) {
  /* Any schema violation rejects here, which fails the test. */
  await new Donation(validDoc(overrides)).validate();
}

describe('Donation schema - a complete donation', () => {
  it('accepts a donation written the way the donor flow writes it', async () => {
    await expectAccepted();
  });

  it('keeps createdAt and updatedAt managed by mongoose', () => {
    expect(Donation.schema.options.timestamps).toBeTruthy();
  });
});

describe('Donation schema - required fields', () => {
  it.each([
    ['donor', 'is required'],
    ['foodType', 'Food type is required'],
    ['quantity', 'Quantity is required'],
    ['numberOfPortions', 'Number of portions is required'],
    ['preparationTime', 'Preparation time is required'],
    ['expiryTime', 'Expiry time is required'],
    ['availabilityStart', 'Availability start is required'],
    ['availabilityEnd', 'Availability end is required'],
  ])('refuses a donation without %s', async (field, message) => {
    const error = await errorOf({ [field]: undefined });

    expect(error).toBeDefined();
    expect(error.errors[field]).toBeDefined();
    expect(error.errors[field].message).toContain(message);
  });
});

describe('Donation schema - amounts', () => {
  it('refuses a quantity below 0.01', async () => {
    const error = await errorOf({ quantity: 0 });

    expect(error.errors.quantity.message).toBe(
      'Quantity must be a positive number',
    );
  });

  it('accepts a fractional quantity, because half a kilo is real food', async () => {
    await expectAccepted({ quantity: 0.5 });
  });

  it('refuses zero portions', async () => {
    const error = await errorOf({ numberOfPortions: 0 });

    expect(error.errors.numberOfPortions.message).toBe(
      'Number of portions must be a positive number',
    );
  });

  it('refuses a share of a portion', async () => {
    const error = await errorOf({ numberOfPortions: 12.5 });

    expect(error.errors.numberOfPortions.message).toBe(
      'Number of portions must be a whole number',
    );
  });

  it('trims the food name and caps it at 120 characters', async () => {
    const donation = new Donation(validDoc({ foodType: '   Fish curry   ' }));

    expect(donation.foodType).toBe('Fish curry');

    const error = await errorOf({ foodType: 'x'.repeat(121) });

    expect(error.errors.foodType).toBeDefined();
    expect(error.errors.foodType.message).toContain(
      'maximum allowed length',
    );
  });

  it('caps the category at 100 characters', async () => {
    const error = await errorOf({ foodCategory: 'x'.repeat(101) });

    expect(error.errors.foodCategory).toBeDefined();
  });
});

describe('Donation schema - timing rules', () => {
  it('refuses an expiry at or before the preparation time', async () => {
    const same = new Date('2026-10-19T18:00:00.000Z');

    const error = await errorOf({
      preparationTime: same,
      expiryTime: same,
    });

    expect(error.errors.expiryTime.message).toBe(
      'Expiry time must be after preparation time',
    );
  });

  it('refuses an availability window that closes before it opens', async () => {
    const error = await errorOf({
      availabilityStart: new Date('2026-10-19T17:00:00.000Z'),
      availabilityEnd: new Date('2026-10-19T16:00:00.000Z'),
    });

    expect(error.errors.availabilityEnd.message).toBe(
      'Availability end must be after availability start',
    );
  });

  it('refuses a pickup window that closes before it opens', async () => {
    const error = await errorOf({
      pickupWindowStart: new Date('2026-10-19T16:00:00.000Z'),
      pickupWindowEnd: new Date('2026-10-19T15:00:00.000Z'),
    });

    expect(error.errors.pickupWindowEnd.message).toBe(
      'Pickup window end must be after pickup window start',
    );
  });

  it('allows a donation with no explicit pickup window', async () => {
    await expectAccepted({
      pickupWindowStart: null,
      pickupWindowEnd: null,
    });
  });
});

describe('Donation schema - stored enums', () => {
  it.each([
    ['donationType', 'FLASH'],
    ['quantityUnit', 'litres'],
    ['storageCondition', 'On the counter'],
    ['aiResult', 'REJECTED'],
    ['status', 'delivered'],
    ['priority', 'urgent'],
  ])('refuses an invented %s value', async (field, value) => {
    const error = await errorOf({ [field]: value });

    expect(error).toBeDefined();
    expect(error.errors[field]).toBeDefined();
  });

  it('accepts every value the donor flow can actually produce', async () => {
    await Promise.all([
      expectAccepted({ donationType: 'URGENT' }),
      expectAccepted({ quantityUnit: 'trays' }),
      expectAccepted({ storageCondition: 'Frozen' }),
      expectAccepted({ aiResult: 'CONCERN' }),
      expectAccepted({ status: 'expired' }),
      expectAccepted({ priority: 'high' }),
    ]);
  });

  it('stores the safety answers as they were reported', async () => {
    await expectAccepted({
      safety: {
        storage: 'NO',
        temperature: 'NOT_SURE',
        handling: 'YES',
        packaging: 'YES',
        allergens: 'YES',
      },
    });
  });

  it('refuses a safety answer outside YES/NO', async () => {
    const error = await errorOf({
      safety: {
        storage: 'MAYBE',
        temperature: 'YES',
        handling: 'YES',
        packaging: 'YES',
        allergens: 'NO',
      },
    });

    expect(error.errors['safety.storage']).toBeDefined();
  });
});

describe('Donation schema - defaults', () => {
  it('starts a new donation as pending, normal and awaiting screening', () => {
    const donation = new Donation(validDoc());

    expect(donation.status).toBe('pending');
    expect(donation.donationType).toBe('NORMAL');
    expect(donation.priority).toBe('medium');
    expect(donation.aiResult).toBe('PENDING');
    expect(donation.quantityUnit).toBe('kg');
    expect(donation.storageCondition).toBe('Room Temperature');
    expect(donation.foodCategory).toBe('Cooked meal');
  });

  it('falls back to Uncategorized when no category is given', () => {
    const donation = new Donation(validDoc({ foodCategory: undefined }));

    expect(donation.foodCategory).toBe('Uncategorized');
  });

  it('leaves the optional notes and photo empty rather than undefined', () => {
    const donation = new Donation(validDoc());

    expect(donation.allergenInfo).toBe('');
    expect(donation.packagingCondition).toBe('');
    expect(donation.additionalDetails).toBe('');
    expect(donation.pickupAddress).toBe('12 Galle Road, Colombo');
    expect(donation.photoUrl).toBeNull();
    expect(donation.safety).toBeDefined();
  });
});

describe('Donation schema - indexes the donor queries rely on', () => {
  const indexes = Donation.schema
    .indexes()
    .map((pair) => JSON.stringify(pair[0]));

  it('indexes My Donations by donor, status and newest first', () => {
    expect(indexes).toContain(
      JSON.stringify({ donor: 1, status: 1, createdAt: -1 }),
    );
  });

  it('indexes the expiry sweep by availability end and status', () => {
    expect(indexes).toContain(
      JSON.stringify({ availabilityEnd: 1, status: 1 }),
    );
  });

  it('keeps the donation reference unique so a code is never reused', () => {
    const path = Donation.schema.path('donationCode');

    expect(path.options.unique).toBe(true);
    expect(path.options.sparse).toBe(true);
  });
});

describe('Donation schema - the shape the API returns', () => {
  it('has no toJSON transform, so a lean read only carries _id', () => {
    /*
     * This is the reason the home feed must read `_id` as well as `id`:
     * /donor/donations answers with `.lean()` documents and mongoose does not
     * add an `id` field to them.
     */
    expect(Donation.schema.options.toJSON).toBeUndefined();

    const lean = new Donation(validDoc()).toObject();

    expect(lean.id).toBeUndefined();
    expect(lean._id).toBeDefined();
  });
});
