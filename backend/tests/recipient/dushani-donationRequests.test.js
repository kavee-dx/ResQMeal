// Sprint item 39 — a recipient asks a donor for one of their donations, and the
// donor reads those asks on the donation's detail page. The ask is its own
// document: the donor's donation is never written to.
const mongoose = require('mongoose');
const Donation = require('../../src/models/kaveesha-Donation');
const FoodRequest = require('../../src/models/dushani-foodRequestModel');
const RecipientProfile = require('../../src/models/dushani-RecipientProfile');
const DonationRequest = require('../../src/models/dushani-donationRequestModel');

const {
  askForDonation,
  getDonationAsks,
  askedDonationIds,
} = require('../../src/services/dushani-donationRequestService');

const DONATION_ID = new mongoose.Types.ObjectId();
const RECIPIENT_ID = new mongoose.Types.ObjectId();
const REQUEST_ID = new mongoose.Types.ObjectId();

function futureDate() {
  return new Date(Date.now() + 6 * 60 * 60 * 1000);
}

function donationDoc(overrides) {
  return {
    _id: DONATION_ID,
    status: 'active',
    expiryTime: futureDate(),
    donationCode: 'RQ-7788',
    ...overrides,
  };
}

function requestDoc(overrides) {
  return {
    _id: REQUEST_ID,
    foodType: 'Cooked Rice',
    quantity: 'Cooked Rice - 6 packets',
    location: 'No. 24, Galle Road, Colombo 03',
    urgency: 'URGENT',
    status: 'PENDING',
    preferredAt: null,
    expiresAt: futureDate(),
    ...overrides,
  };
}

// Model queries chain (`find().sort().populate().lean()`), so the mock keeps
// answering every link in the chain.
function query(value) {
  const chain = {};
  chain.sort = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.populate = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.lean = jest.fn(async () => value);
  return chain;
}

function mockAskDb({ donation = donationDoc(), request = null, held = [], asks = [], profiles = [] }) {
  const findById = jest.spyOn(Donation, 'findById').mockReturnValue(query(donation));
  const findOne = jest.spyOn(Donation, 'findOne').mockReturnValue(query(donation));
  const findRequests = jest.spyOn(FoodRequest, 'find').mockReturnValue(query(held));
  const findRequest = jest.spyOn(FoodRequest, 'findOne').mockReturnValue(query(request));
  const upsert = jest.spyOn(DonationRequest, 'findOneAndUpdate').mockImplementation(
    async (_filter, update) => ({
      _id: new mongoose.Types.ObjectId(),
      donation: DONATION_ID,
      recipient: RECIPIENT_ID,
      request: update.$set.request,
      note: update.$set.note,
      createdAt: new Date('2026-10-02T04:00:00.000Z'),
    }),
  );
  const findAsks = jest.spyOn(DonationRequest, 'find').mockReturnValue(query(asks));
  const findProfiles = jest.spyOn(RecipientProfile, 'find').mockReturnValue(query(profiles));
  return { findById, findOne, findRequests, findRequest, upsert, findAsks, findProfiles };
}

describe('askForDonation — writing the ask', () => {
  afterEach(() => jest.restoreAllMocks());

  it('needs a signed-in recipient', async () => {
    await expect(askForDonation({ recipientId: null, donationId: DONATION_ID })).rejects.toMatchObject(
      { statusCode: 401 }
    );
  });

  it('refuses a junk donation id before touching the database', async () => {
    mockAskDb({});
    await expect(askForDonation({ recipientId: RECIPIENT_ID, donationId: 'not-an-id' })).rejects.toMatchObject(
      { statusCode: 400 }
    );
  });

  it('writes against the donation and this recipient only', async () => {
    const spies = mockAskDb({ request: requestDoc() });

    await askForDonation({
      recipientId: RECIPIENT_ID,
      donationId: DONATION_ID,
      requestId: REQUEST_ID,
      note:  ' We can collect at 4pm. ',
    });

    expect(spies.upsert.mock.calls[0][0]).toEqual({ donation: DONATION_ID, recipient: RECIPIENT_ID });
    expect(spies.upsert.mock.calls[0][1]).toEqual({
      $set: { request: REQUEST_ID, note: 'We can collect at 4pm.' },
    });
    expect(spies.upsert.mock.calls[0][2]).toMatchObject({ upsert: true, new: true });
  });

  it('keeps an ask that names no request', async () => {
    const spies = mockAskDb({});
    const result = await askForDonation({ recipientId: RECIPIENT_ID, donationId: DONATION_ID });
    expect(spies.upsert.mock.calls[0][1]).toEqual({ $set: { request: null, note: '' } });
    expect(result).toMatchObject({ donationId: `${DONATION_ID}`, requestId: null });
  });

  it('refuses a donation the donor has already closed', async () => {
    mockAskDb({ donation: donationDoc({ status: 'completed' }) });
    await expect(
      askForDonation({ recipientId: RECIPIENT_ID, donationId: DONATION_ID })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('refuses a donation whose expiry has passed', async () => {
    mockAskDb({ donation: donationDoc({ expiryTime: new Date(Date.now() - 1000) }) });
    await expect(
      askForDonation({ recipientId: RECIPIENT_ID, donationId: DONATION_ID })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('says the donation is gone when a donor deleted the post', async () => {
    mockAskDb({ donation: null });
    await expect(
      askForDonation({ recipientId: RECIPIENT_ID, donationId: DONATION_ID })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuses a donation already committed to another recipient', async () => {
    mockAskDb({ held: [{ linkedDonation: DONATION_ID }] });
    await expect(
      askForDonation({ recipientId: RECIPIENT_ID, donationId: DONATION_ID })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('will not attach somebody else’s request', async () => {
    mockAskDb({ request: null });
    await expect(
      askForDonation({ recipientId: RECIPIENT_ID, donationId: DONATION_ID, requestId: REQUEST_ID })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('will not attach a request a donor already accepted', async () => {
    mockAskDb({ request: requestDoc({ status: 'MATCHED' }) });
    await expect(
      askForDonation({ recipientId: RECIPIENT_ID, donationId: DONATION_ID, requestId: REQUEST_ID })
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('getDonationAsks — what the donor reads', () => {
  afterEach(() => jest.restoreAllMocks());

  it('is only for the donor role', async () => {
    mockAskDb({});
    await expect(
      getDonationAsks({ donorId: RECIPIENT_ID, role: 'RECIPIENT', donationId: DONATION_ID })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('reads as missing when the donation belongs to another donor', async () => {
    const spies = mockAskDb({ donation: null });
    await expect(
      getDonationAsks({ donorId: RECIPIENT_ID, role: 'DONOR', donationId: DONATION_ID })
    ).rejects.toMatchObject({ statusCode: 404 });
    // Scoped to the owner, so the lookup itself carries the donor id.
    expect(spies.findOne.mock.calls[0][0]).toEqual({ _id: DONATION_ID, donor: RECIPIENT_ID });
  });

  it('shows who asked, what they need, and nothing else', async () => {
    mockAskDb({
      asks: [
        {
          _id: new mongoose.Types.ObjectId(),
          recipient: { _id: RECIPIENT_ID, fullName: 'Tharushi Fernando' },
          request: requestDoc(),
          note: 'We run a children’s home in Colombo 03.',
          createdAt: new Date('2026-10-02T04:00:00.000Z'),
        },
      ],
    });

    const result = await getDonationAsks({
      donorId: DONATION_ID,
      role: 'DONOR',
      donationId: DONATION_ID,
    });

    expect(result).toMatchObject({ donationCode: 'RQ-7788', count: 1 });
    expect(result.requests[0]).toMatchObject({
      recipientName: 'Tharushi Fernando',
      need: 'Cooked Rice',
      quantity: 'Cooked Rice - 6 packets',
      area: 'No. 24, Galle Road, Colombo 03',
      urgency: 'URGENT',
      stillWaiting: true,
      note: 'We run a children’s home in Colombo 03.',
    });
  });

  it('names an organisation recipient from their profile', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const spies = mockAskDb({
      asks: [
        {
          _id: new mongoose.Types.ObjectId(),
          recipient: { _id: orgId },
          request: null,
          note: '',
          createdAt: new Date('2026-10-02T04:00:00.000Z'),
        },
      ],
      profiles: [{ userId: orgId, organizationName: 'Lighthouse Home' }],
    });

    const result = await getDonationAsks({ donorId: DONATION_ID, role: 'DONOR', donationId: DONATION_ID });

    expect(spies.findAsks.mock.calls[0][0]).toEqual({ donation: DONATION_ID });
    expect(result.requests[0]).toMatchObject({
      recipientName: 'Lighthouse Home',
      need: '',
      requestId: null,
      stillWaiting: false,
    });
  });

  it('says when a request stopped waiting after the ask', async () => {
    mockAskDb({
      asks: [
        {
          _id: new mongoose.Types.ObjectId(),
          recipient: { _id: RECIPIENT_ID, fullName: 'Tharushi' },
          // Past its expiry but the expiry job has not run yet.
          request: requestDoc({ expiresAt: new Date(Date.now() - 60_000) }),
          note: '',
          createdAt: new Date('2026-10-02T04:00:00.000Z'),
        },
      ],
    });

    const result = await getDonationAsks({ donorId: DONATION_ID, role: 'DONOR', donationId: DONATION_ID });
    expect(result.requests[0].stillWaiting).toBe(false);
  });

  it('never carries a phone number or an email', async () => {
    mockAskDb({
      asks: [
        {
          _id: new mongoose.Types.ObjectId(),
          recipient: { _id: RECIPIENT_ID, fullName: 'Tharushi', email: 't@x.lk', phone: '0771234567' },
          request: requestDoc({ contactNumber: '0771234567' }),
          note: 'hello',
          createdAt: new Date('2026-10-02T04:00:00.000Z'),
        },
      ],
    });

    const result = await getDonationAsks({ donorId: DONATION_ID, role: 'DONOR', donationId: DONATION_ID });
    expect(Object.keys(result.requests[0]).sort()).toEqual(
      [
        'area',
        'askedAt',
        'id',
        'need',
        'neededBy',
        'note',
        'quantity',
        'recipientId',
        'recipientName',
        'requestId',
        'stillWaiting',
        'urgency',
      ].sort()
    );
    expect(JSON.stringify(result)).not.toContain('0771234567');
  });
});

describe('askedDonationIds — the browse page marker', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns the ids as plain strings', async () => {
    const spies = mockAskDb({ asks: [{ donation: DONATION_ID }, { donation: RECIPIENT_ID }] });
    const ids = await askedDonationIds(RECIPIENT_ID);

    expect(spies.findAsks.mock.calls[0][0]).toEqual({ recipient: RECIPIENT_ID });
    expect([...ids]).toEqual([`${DONATION_ID}`, `${RECIPIENT_ID}`]);
  });

  it('asks nothing for an anonymous caller', async () => {
    mockAskDb({});
    await expect(askedDonationIds(null)).resolves.toEqual(new Set());
  });
});
