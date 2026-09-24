// Sprint item 4 — Browse Donations: the live donation pool a recipient searches,
// filtered by food type, quantity and distance, with urgent-request matches first.
const FoodRequest = require('../../src/models/dushani-foodRequestModel');
const Donation = require('../../src/models/kaveesha-Donation.model');
const User = require('../../src/models/dushani-User');
const DonorProfile = require('../../src/models/dushani-DonorProfile');

const {
  browseDonations,
  FOOD_GROUPS,
  groupOf,
  distanceFrom,
} = require('../../src/services/dushani-browseDonationsService');

const NOW = new Date('2026-09-24T06:00:00.000Z').getTime();
const VIEWER = { _id: 'u1', district: 'Colombo', city: 'Colombo' };

function stub(overrides) {
  return {
    _id: { toString: () => 'x' },
    foodType: 'Cooked rice',
    foodCategory: 'Rice',
    quantity: 10,
    numberOfPortions: 20,
    pickupAddress: 'No. 12, Hill Road, Colombo 03',
    pickupDistrict: 'Colombo',
    status: 'active',
    priority: 'medium',
    donationCode: 'RQ-1001',
    photoUrl: null,
    storageCondition: 'Refrigerated',
    expiryTime: new Date('2026-09-24T18:00:00.000Z'),
    pickupWindowStart: null,
    donor: 'donorA',
    ...overrides,
  };
}

function request(overrides) {
  return {
    _id: { toString: () => 'reqNormal' },
    foodType: 'Cooked Rice',
    quantity: 'Cooked Rice - 6 packets',
    location: 'No. 24, Galle Road, Colombo 03',
    urgency: 'NORMAL',
    status: 'PENDING',
    preferredAt: new Date('2026-09-24T12:00:00.000Z'),
    expiresAt: new Date('2026-09-25T12:00:00.000Z'),
    ...overrides,
  };
}

// Model queries chain (`find().sort().limit().lean()`), so the mock keeps
// answering every link in the chain.
function chainable(value) {
  const chain = {};
  chain.sort = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.lean = jest.fn(async () => value);
  return chain;
}

function mockDb({ donations = [], requests: docs = [], users = [], profiles = [] }) {
  jest.spyOn(Donation, 'find').mockReturnValue(chainable(donations));
  jest.spyOn(FoodRequest, 'find').mockReturnValue(chainable(docs));
  jest.spyOn(User, 'findById').mockReturnValue(chainable(VIEWER));
  jest.spyOn(User, 'find').mockReturnValue(chainable(users));
  jest.spyOn(DonorProfile, 'find').mockReturnValue(chainable(profiles));
}

const RICE = stub({ _id: 'donRice', foodType: 'Cooked rice', donor: 'donorA' });
const BREAD = stub({
  _id: 'donBread',
  foodType: 'Sliced bread',
  foodCategory: 'Bakery',
  numberOfPortions: 8,
  donor: 'donorB',
});
const WATER_FAR = stub({
  _id: 'donWater',
  foodType: 'Bottled water',
  foodCategory: 'Beverages',
  pickupDistrict: 'Galle',
  pickupAddress: 'No. 3, Havelock Place, Galle',
  numberOfPortions: 40,
  donor: 'donorA',
});

describe('browse donations — the pool', () => {
  afterEach(() => jest.restoreAllMocks());

  it('only asks for live donations that have not expired', async () => {
    mockDb({});
    await browseDonations({ recipientId: 'u1', now: NOW });

    const filter = Donation.find.mock.calls[0][0];
    expect(filter.status.$in).toEqual(['active', 'expiring', 'pending']);
    expect(filter.expiryTime.$gt).toEqual(new Date(NOW));
  });

  it('refuses to list donations for a caller with no identity', async () => {
    await expect(browseDonations({ recipientId: null })).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('shows a business donor by its business name, an individual by their own', async () => {
    mockDb({
      donations: [RICE, BREAD],
      users: [
        { _id: 'donorA', fullName: 'Nimal Perera' },
        { _id: 'donorB', fullName: 'Kamla Silva' },
      ],
      profiles: [{ userId: 'donorA', businessName: "Nimal's Kitchen" }],
    });

    const result = await browseDonations({ recipientId: 'u1', now: NOW });
    const byId = Object.fromEntries(result.donations.map((item) => [item.id, item]));
    expect(byId.donRice.donorName).toBe("Nimal's Kitchen");
    expect(byId.donBread.donorName).toBe('Kamla Silva');
  });

  it('never leaks the donor phone number or email', async () => {
    mockDb({ donations: [RICE], users: [{ _id: 'donorA', fullName: 'Nimal' }] });
    const result = await browseDonations({ recipientId: 'u1', now: NOW });
    expect(Object.keys(result.donations[0]).sort()).toEqual(
      [
        'answering',
        'distanceLabel',
        'distanceTier',
        'donationCode',
        'donorName',
        'expiryTime',
        'foodCategory',
        'foodGroup',
        'foodType',
        'id',
        'inOwnDistrict',
        'numberOfPortions',
        'photoUrl',
        'pickupAddress',
        'pickupDistrict',
        'pickupWindowStart',
        'quantity',
        'readyWhen',
        'status',
        'storageCondition',
      ].sort()
    );
  });

  it('groups food the way the request form words it', () => {
    expect(groupOf(stub({ foodType: 'Parboiled rice', foodCategory: '' }))).toBe('Rice');
    expect(groupOf(stub({ foodType: 'Sliced bread', foodCategory: 'Bakery' }))).toBe('Bread');
    expect(groupOf(stub({ foodType: 'Bottled water', foodCategory: 'Beverages' }))).toBe('Water');
    expect(groupOf(stub({ foodType: 'Mixed things', foodCategory: 'Uncategorized' }))).toBe('Other');
    expect(FOOD_GROUPS.map((group) => group.key)).toContain('Vegetables');
  });

  it('says how far a pickup is from the recipient', () => {
    expect(distanceFrom(VIEWER, stub({ pickupDistrict: 'Colombo' })).ownDistrict).toBe(true);
    expect(distanceFrom(VIEWER, stub({ pickupDistrict: 'Galle' })).ownDistrict).toBe(false);
    expect(distanceFrom(VIEWER, stub({ pickupDistrict: '', pickupAddress: 'Kandy' })).label).toBe(
      'Pickup area not given'
    );
  });
});

describe('browse donations — search, type, quantity and distance', () => {
  afterEach(() => jest.restoreAllMocks());

  beforeEach(() => {
    mockDb({
      donations: [RICE, BREAD, WATER_FAR],
      users: [
        { _id: 'donorA', fullName: 'Nimal' },
        { _id: 'donorB', fullName: 'Kamla' },
      ],
    });
  });

  it('lists every live donation by default', async () => {
    const result = await browseDonations({ recipientId: 'u1', now: NOW });
    expect(result.donations.map((item) => item.id)).toEqual(['donBread', 'donRice', 'donWater']);
    expect(result.stats.total).toBe(3);
  });

  it('filters to one food type', async () => {
    const result = await browseDonations({ recipientId: 'u1', group: 'Bread', now: NOW });
    expect(result.donations.map((item) => item.id)).toEqual(['donBread']);
    expect(result.filters.group).toBe('Bread');
  });

  it('searches food, pickup area and donor name', async () => {
    const byArea = await browseDonations({ recipientId: 'u1', search: 'Galle', now: NOW });
    expect(byArea.donations.map((item) => item.id)).toEqual(['donWater']);

    const byDonor = await browseDonations({ recipientId: 'u1', search: 'kamla', now: NOW });
    expect(byDonor.donations.map((item) => item.id)).toEqual(['donBread']);

    const noMatch = await browseDonations({ recipientId: 'u1', search: 'medicine', now: NOW });
    expect(noMatch.donations).toEqual([]);
  });

  it('filters on how many portions the donor can give', async () => {
    const result = await browseDonations({ recipientId: 'u1', minPortions: '15', now: NOW });
    expect(result.donations.map((item) => item.id)).toEqual(['donRice', 'donWater']);
    expect(result.filters.minPortions).toBe(15);
  });

  it('ignores a junk portion count instead of emptying the page', async () => {
    const result = await browseDonations({ recipientId: 'u1', minPortions: 'lots', now: NOW });
    expect(result.donations).toHaveLength(3);
    expect(result.filters.minPortions).toBeNull();
  });

  it('keeps only pickups in the recipient own district', async () => {
    const result = await browseDonations({ recipientId: 'u1', distance: 'own-district', now: NOW });
    expect(result.donations.map((item) => item.id)).toEqual(['donBread', 'donRice']);
    expect(result.stats.nearby).toBe(2);
  });

  it('falls back to the filter defaults for unknown values', async () => {
    const result = await browseDonations({
      recipientId: 'u1',
      group: 'Pizza',
      distance: 'moon',
      sort: 'chaos',
      now: NOW,
    });
    expect(result.filters).toMatchObject({ group: '', distance: 'anywhere', sort: 'suggested' });
    expect(result.donations).toHaveLength(3);
  });
});

describe('browse donations — emergency requests are suggested first', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lifts the donation that answers an urgent request above a better-scoring one', async () => {
    mockDb({
      donations: [RICE, BREAD],
      users: [{ _id: 'donorA' }, { _id: 'donorB' }],
      requests: [
        request({ _id: 'reqNormal', foodType: 'Cooked Rice, Bread', quantity: 'Cooked Rice - 1 packets, Bread - 1 loaf' }),
        request({
          _id: 'reqUrgent',
          foodType: 'Bread',
          quantity: 'Bread - 2 loaves',
          urgency: 'URGENT',
        }),
      ],
    });

    const result = await browseDonations({ recipientId: 'u1', now: NOW });
    expect(result.donations[0].id).toBe('donBread');
    expect(result.donations[0].answering).toMatchObject({
      requestId: 'reqUrgent',
      urgent: true,
      requestFood: 'Bread',
    });
    expect(result.donations[0].answering.reasons.length).toBeGreaterThan(0);
    expect(result.stats.urgent).toBe(1);
    expect(result.stats.answering).toBe(2);
    expect(result.criteria).toHaveLength(4);
  });

  it('leaves a donation alone when it answers nothing', async () => {
    mockDb({ donations: [WATER_FAR], users: [{ _id: 'donorA' }], requests: [] });
    const result = await browseDonations({ recipientId: 'u1', now: NOW });
    expect(result.donations[0].answering).toBeNull();
    expect(result.stats).toMatchObject({ urgent: 0, answering: 0 });
  });

  it('stops suggesting for a request that has been filled or gone past its time', async () => {
    mockDb({
      donations: [RICE],
      users: [{ _id: 'donorA' }],
      requests: [
        request({ _id: 'reqDone', status: 'FULFILLED' }),
        request({
          _id: 'reqLate',
          status: 'PENDING',
          expiresAt: new Date(NOW - 60_000),
        }),
      ],
    });

    const result = await browseDonations({ recipientId: 'u1', now: NOW });
    expect(result.donations[0].answering).toBeNull();
  });
});

describe('browse donations — ordering', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sorts nearest first when the recipient asks for distance', async () => {
    mockDb({
      donations: [WATER_FAR, RICE],
      users: [{ _id: 'donorA' }],
    });
    const result = await browseDonations({ recipientId: 'u1', sort: 'nearest', now: NOW });
    expect(result.donations.map((item) => item.id)).toEqual(['donRice', 'donWater']);
  });

  it('sorts by the soonest expiry', async () => {
    mockDb({
      donations: [
        RICE,
        stub({ _id: 'donSoon', expiryTime: new Date(NOW + 3_600_000) }),
      ],
      users: [{ _id: 'donorA' }],
    });
    const result = await browseDonations({ recipientId: 'u1', sort: 'expiring', now: NOW });
    expect(result.donations.map((item) => item.id)).toEqual(['donSoon', 'donRice']);
    expect(result.stats.expiringSoon).toBe(1);
  });

  it('says when the food can actually be collected', async () => {
    mockDb({
      donations: [
        stub({ _id: 'donLate', pickupWindowStart: new Date(NOW + 7_200_000) }),
        stub({ _id: 'donPending', status: 'pending' }),
        RICE,
      ],
      users: [{ _id: 'donorA' }],
    });
    const result = await browseDonations({ recipientId: 'u1', now: NOW });
    const byId = Object.fromEntries(result.donations.map((item) => [item.id, item.readyWhen]));
    expect(byId.donLate).toBe('Ready later today');
    expect(byId.donPending).toBe('Not prepared yet');
    expect(byId.donRice).toBe('Ready to collect now');
  });
});
