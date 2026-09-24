// Sprint item 4 — Donation–Request Matching: the four criteria, the ranking,
// and the two recipient endpoints that read them.
const FoodRequest = require('../../src/models/dushani-foodRequestModel');
const Donation = require('../../src/models/kaveesha-Donation.model');
const User = require('../../src/models/dushani-User');

const {
  MATCH_CRITERIA,
  parseRequestedItems,
  foodTokens,
  rankDonations,
  getRequestMatches,
  getRecipientSuggestions,
} = require('../../src/services/dushani-matchRequestService');

const NOW = new Date('2026-09-24T06:00:00.000Z').getTime();
const COLOMBO_PROFILE = { district: 'Colombo', city: 'Colombo' };

function stubRequest(overrides) {
  return {
    _id: { toString: () => 'req1' },
    foodType: 'Cooked Rice',
    quantity: 'Cooked Rice - 6 packets',
    location: 'No. 24, Galle Road, Colombo 03',
    urgency: 'NORMAL',
    status: 'PENDING',
    preferredAt: new Date('2026-09-24T09:00:00.000Z'),
    expiresAt: new Date('2026-09-25T09:00:00.000Z'),
    ...overrides,
  };
}

function stubDonation(overrides) {
  return {
    _id: { toString: () => 'don1' },
    foodType: 'Cooked rice',
    foodCategory: 'Rice',
    quantity: 10,
    numberOfPortions: 20,
    pickupAddress: 'No. 12, Galle Road, Colombo 03',
    pickupDistrict: 'Colombo',
    status: 'active',
    priority: 'medium',
    donationCode: 'RQ-1001',
    photoUrl: null,
    expiryTime: new Date('2026-09-24T18:00:00.000Z'),
    pickupWindowStart: null,
    ...overrides,
  };
}

// Model queries are chained (`find().sort().limit().lean()`), so the mock hands
// back an object that keeps answering every link in the chain.
function chainable(value) {
  const chain = {};
  chain.sort = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.lean = jest.fn(async () => value);
  return chain;
}

const mockCandidates = (donations) =>
  jest.spyOn(Donation, 'find').mockReturnValue(chainable(donations));
const mockProfile = (profile) => jest.spyOn(User, 'findById').mockReturnValue(chainable(profile));
const mockOneRequest = (doc) =>
  jest.spyOn(FoodRequest, 'findOne').mockReturnValue(chainable(doc));
const mockRequests = (docs) =>
  jest.spyOn(FoodRequest, 'find').mockReturnValue(chainable(docs));

describe('matching criteria (sprint item 4)', () => {
  it('weights the four criteria to exactly 100 points', () => {
    expect(MATCH_CRITERIA.map((criterion) => criterion.key)).toEqual([
      'foodType',
      'quantity',
      'proximity',
      'urgency',
    ]);
    expect(MATCH_CRITERIA.reduce((sum, criterion) => sum + criterion.weight, 0)).toBe(100);
    expect(MATCH_CRITERIA[0].weight).toBeGreaterThan(MATCH_CRITERIA[3].weight);
  });

  it('reads the requested amounts out of the composed quantity line', () => {
    expect(
      parseRequestedItems('Cooked Rice, Carrot', 'Cooked Rice - 6 packets, Carrot - 2 kg'),
    ).toEqual([
      { name: 'Cooked Rice', amount: 6, unit: 'packets' },
      { name: 'Carrot', amount: 2, unit: 'kg' },
    ]);
  });

  it('tolerates a quantity line with no amount on it', () => {
    expect(parseRequestedItems('Cooked Rice', 'Cooked Rice -')).toEqual([
      { name: 'Cooked Rice', amount: null, unit: '' },
    ]);
  });

  it('matches food across wording through word stems', () => {
    expect(foodTokens('Cooked Rice')).toContain('rice');
    expect(foodTokens('Parboiled rice 5kg')).toContain('rice');
    expect(foodTokens('Assorted bread and biscuits')).toEqual(
      expect.arrayContaining(['bread', 'biscuit']),
    );
  });

  it('scores a same-district donation that covers the request at 100', () => {
    const matches = rankDonations(stubRequest({}), [stubDonation()], COLOMBO_PROFILE, NOW);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      donationId: 'don1',
      score: 100,
      percent: 100,
      breakdown: { foodType: 40, quantity: 20, proximity: 25, urgency: 15 },
    });
    expect(matches[0].reasons[0]).toContain('Cooked Rice');
  });

  it('drops a donation with no food overlap in another district', () => {
    const matches = rankDonations(
      stubRequest({}),
      [
        stubDonation({
          foodType: 'Cut fruit',
          foodCategory: 'Fruits',
          pickupDistrict: 'Galle',
          pickupAddress: 'Hill Street, Galle',
        }),
      ],
      COLOMBO_PROFILE,
      NOW,
    );
    expect(matches).toEqual([]);
  });

  it('halves the quantity credit when the donation is too small', () => {
    const matches = rankDonations(
      stubRequest({ quantity: 'Cooked Rice - 6 packets' }),
      [stubDonation({ numberOfPortions: 3 })],
      COLOMBO_PROFILE,
      NOW,
    );
    expect(matches[0].breakdown.quantity).toBe(10);
    expect(matches[0].reasons).toEqual(expect.arrayContaining(['3 of about 6 portions']));
  });

  it('prefers the closer donation when both carry the same food', () => {
    const matches = rankDonations(
      stubRequest({}),
      [
        stubDonation({
          _id: { toString: () => 'far' },
          pickupDistrict: 'Kalutara',
          pickupAddress: 'Beach Road, Kalutara',
        }),
        stubDonation({ _id: { toString: () => 'near' } }),
      ],
      COLOMBO_PROFILE,
      NOW,
    );
    expect(matches.map((match) => match.donationId)).toEqual(['near', 'far']);
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it('gives an emergency request full timing credit only for food ready now', () => {
    const urgent = stubRequest({ urgency: 'URGENT', preferredAt: null });
    const ready = rankDonations(urgent, [stubDonation()], COLOMBO_PROFILE, NOW);
    const queued = rankDonations(
      urgent,
      [stubDonation({ status: 'pending' })],
      COLOMBO_PROFILE,
      NOW,
    );

    expect(ready[0].breakdown.urgency).toBe(15);
    expect(ready[0].reasons).toEqual(expect.arrayContaining(['Ready now']));
    expect(queued[0].breakdown.urgency).toBe(5);
    expect(queued[0].reasons).toEqual(expect.arrayContaining(['Not prepared yet']));
  });

  it('penalises a donation that spoils before the food is needed', () => {
    const matches = rankDonations(
      stubRequest({ preferredAt: new Date('2026-09-24T09:00:00.000Z') }),
      [stubDonation({ expiryTime: new Date('2026-09-24T08:00:00.000Z') })],
      COLOMBO_PROFILE,
      NOW,
    );
    expect(matches[0].breakdown.urgency).toBe(5);
    expect(matches[0].reasons).toEqual(
      expect.arrayContaining(['Expires before it is needed']),
    );
  });

  it('breaks a score tie by putting the soonest-expiring donation first', () => {
    const matches = rankDonations(
      stubRequest({}),
      [
        stubDonation({
          _id: { toString: () => 'late' },
          expiryTime: new Date('2026-09-25T18:00:00.000Z'),
        }),
        stubDonation({
          _id: { toString: () => 'soon' },
          expiryTime: new Date('2026-09-24T09:00:00.000Z'),
        }),
      ],
      COLOMBO_PROFILE,
      NOW,
    );
    expect(matches.map((match) => match.donationId)).toEqual(['soon', 'late']);
    expect(matches[0].score).toBe(matches[1].score);
  });
});

describe('getRequestMatches (sprint item 4)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('404s a request the caller does not own', async () => {
    mockOneRequest(null);
    await expect(
      getRequestMatches({ recipientId: 'recipient1', requestId: 'req1', now: NOW }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns nothing once the request stopped waiting', async () => {
    mockOneRequest(stubRequest({ status: 'MATCHED' }));

    const result = await getRequestMatches({
      recipientId: 'recipient1',
      requestId: 'req1',
      now: NOW,
    });
    expect(result.matches).toEqual([]);
    expect(result.request.matched).toBe(false);
    expect(result.note).toContain('no longer waiting');
  });

  it('ranks live donations and reports the criteria used', async () => {
    mockOneRequest(stubRequest({}));
    mockProfile(COLOMBO_PROFILE);
    mockCandidates([stubDonation(), stubDonation({ _id: { toString: () => 'x' } })]);

    const result = await getRequestMatches({
      recipientId: 'recipient1',
      requestId: 'req1',
      now: NOW,
    });

    expect(result.criteria).toHaveLength(4);
    expect(result.request).toMatchObject({ id: 'req1', urgency: 'NORMAL', matched: true });
    expect(result.matches[0]).toMatchObject({ donationId: 'don1' });
  });

  it('only considers donations that are still alive', async () => {
    mockOneRequest(stubRequest({}));
    mockProfile(COLOMBO_PROFILE);
    const find = mockCandidates([]);

    await getRequestMatches({ recipientId: 'recipient1', requestId: 'req1', now: NOW });

    const filter = find.mock.calls[0][0];
    expect(filter.status.$in).toEqual(['active', 'expiring', 'pending']);
    expect(filter.expiryTime.$gt).toEqual(new Date(NOW));
  });
});

describe('getRecipientSuggestions (sprint item 4)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('puts the emergency request and its suggestions first', async () => {
    mockRequests([
      stubRequest({ _id: { toString: () => 'standard' }, urgency: 'NORMAL' }),
      stubRequest({
        _id: { toString: () => 'emergency' },
        urgency: 'URGENT',
        preferredAt: null,
      }),
    ]);
    mockProfile(COLOMBO_PROFILE);
    mockCandidates([stubDonation()]);

    const { groups, suggestions } = await getRecipientSuggestions({
      recipientId: 'recipient1',
      now: NOW,
    });

    expect(groups.map((group) => group.request.id)).toEqual(['emergency', 'standard']);
    expect(groups[0].urgent).toBe(true);
    expect(suggestions[0]).toMatchObject({ requestId: 'emergency', urgent: true });
  });

  it('ignores requests that were matched, delivered or have expired', async () => {
    mockRequests([
      stubRequest({ _id: { toString: () => 'done' }, status: 'FULFILLED' }),
      stubRequest({
        _id: { toString: () => 'dead' },
        status: 'PENDING',
        expiresAt: new Date(NOW - 60_000),
      }),
    ]);
    mockProfile(COLOMBO_PROFILE);
    mockCandidates([stubDonation()]);

    const { groups, suggestions } = await getRecipientSuggestions({
      recipientId: 'recipient1',
      now: NOW,
    });
    expect(groups).toEqual([]);
    expect(suggestions).toEqual([]);
  });

  it('caps the suggestions shown per request', async () => {
    mockRequests([stubRequest({})]);
    mockProfile(COLOMBO_PROFILE);
    mockCandidates(
      ['a', 'b', 'c', 'd', 'e'].map((id) =>
        stubDonation({ _id: { toString: () => id }, expiryTime: new Date(NOW + 3_600_000) }),
      ),
    );

    const { groups } = await getRecipientSuggestions({
      recipientId: 'recipient1',
      now: NOW,
      limit: 2,
    });
    expect(groups[0].matches).toHaveLength(2);
  });
});
