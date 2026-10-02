const mongoose = require('mongoose');
const DonationRequest = require('../models/dushani-donationRequestModel');
const Donation = require('../models/kaveesha-Donation');
const FoodRequest = require('../models/dushani-foodRequestModel');
const User = require('../models/dushani-User');
const RecipientProfile = require('../models/dushani-RecipientProfile');
const { effectiveStatus } = require('./dushani-requestProgressService');
const { heldDonationIds, isHeld } = require('./dushani-donationHoldService');

// The same live pool the browse page searches, so a recipient can only ask for
// a donation a donor actually has on the shelf right now.
const LIVE_DONATION_STATUSES = ['active', 'expiring', 'pending'];

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function requireId(value, label) {
  if (!value) fail(`${label} is required`, 400);
  // Mongoose throws a raw CastError on a bad id, which would surface as a 500.
  if (!mongoose.isValidObjectId(value)) fail(`${label} is not a valid id`, 400);
}

/**
 * Ask a donor for one of their donations.
 *
 * The ask belongs to the recipient, never to the donation: nothing here writes
 * on the donor's document, so a donation's own lifecycle stays the donor's.
 */
async function askForDonation({ recipientId, donationId, requestId = null, note = '' }) {
  if (!recipientId) fail('A signed-in recipient is required', 401);
  requireId(donationId, 'donationId');
  if (requestId) requireId(requestId, 'requestId');

  const [donation, held] = await Promise.all([
    Donation.findById(donationId)
      .select('status expiryTime')
      .lean(),
    heldDonationIds(),
  ]);

  if (!donation) fail('That donation is no longer listed', 404);
  const isLive =
    LIVE_DONATION_STATUSES.includes(donation.status) &&
    new Date(donation.expiryTime).getTime() > Date.now();
  if (!isLive) fail('That donation has already gone — pick another one', 409);
  if (isHeld(donation._id, held)) {
    fail('Another recipient has already been given this donation', 409);
  }

  // An ask can point at the recipient's own waiting request so the donor reads
  // the need behind it. Someone else's request, or one already claimed, is not
  // that recipient's business to attach.
  if (requestId) {
    const request = await FoodRequest.findOne({ _id: requestId, recipient: recipientId }).lean();
    if (!request) fail('That food request was not found', 404);
    if (effectiveStatus(request, Date.now()) !== 'PENDING') {
      fail('That request is no longer waiting for a donor', 409);
    }
  }

  const trimmed = `${note ?? ''}`.trim().slice(0, 300);
  const ask = await DonationRequest.findOneAndUpdate(
    { donation: donationId, recipient: recipientId },
    { $set: { request: requestId ?? null, note: trimmed } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return {
    id: `${ask._id}`,
    donationId: `${ask.donation}`,
    requestId: ask.request ? `${ask.request}` : null,
    note: ask.note,
    askedAt: ask.createdAt,
  };
}

/**
 * Everything the recipients have asked for one donation, newest first.
 *
 * Donor-only and donor-owned, matching how the donation detail page already
 * loads: someone else's donation reads as missing. Only the recipient's name
 * and their need come back — never a phone number, an email or an address
 * beyond the area text on their own request.
 */
async function getDonationAsks({ donorId, role, donationId }) {
  if (!donorId) fail('A signed-in donor is required', 401);
  if (role !== 'DONOR') fail('Only the donor who posted a donation can read its asks', 403);
  requireId(donationId, 'donationId');

  const donation = await Donation.findOne({ _id: donationId, donor: donorId })
    .select('donationCode')
    .lean();
  if (!donation) fail('Donation not found', 404);

  const asks = await DonationRequest.find({ donation: donationId })
    .sort({ createdAt: -1 })
    .populate('recipient', 'fullName')
    // expiresAt is in the list because effectiveStatus needs it to tell a
    // request that is truly waiting from one the expiry job has not closed yet.
    .populate('request', 'foodType quantity location urgency preferredAt status expiresAt')
    .lean();

  const names = await posterNames(asks.map((ask) => ask.recipient));

  return {
    donationId: `${donationId}`,
    donationCode: donation.donationCode ?? null,
    count: asks.length,
    requests: asks.map((ask) => {
      const request = ask.request;
      return {
        id: `${ask._id}`,
        recipientId: `${ask.recipient?._id ?? ''}`,
        recipientName: names.get(`${ask.recipient?._id}`) ?? 'A ResQMeal recipient',
        note: ask.note,
        askedAt: ask.createdAt,
        requestId: request ? `${request._id}` : null,
        need: request?.foodType ?? '',
        quantity: request?.quantity ?? '',
        area: request?.location ?? '',
        urgency: request?.urgency ?? 'NORMAL',
        neededBy: request?.preferredAt ?? null,
        // A recipient can withdraw or get their request filled after asking, so
        // the donor is told whether this ask is still live.
        stillWaiting: Boolean(request) && effectiveStatus(request, Date.now()) === 'PENDING',
      };
    }),
  };
}

/** Ids of the donations this recipient has already asked for. */
async function askedDonationIds(recipientId) {
  if (!recipientId) return new Set();
  const rows = await DonationRequest.find({ recipient: recipientId })
    .select('donation')
    .lean();
  return new Set(rows.map((row) => `${row.donation}`));
}

// Individuals sign up with `fullName`; organisation recipients keep their name
// on the role profile, so only those accounts need the second lookup.
async function posterNames(recipients) {
  const names = new Map();
  const organisations = [];

  for (const person of recipients) {
    if (!person) continue;
    const id = `${person._id}`;
    if (person.fullName) names.set(id, person.fullName);
    else organisations.push(id);
  }

  if (organisations.length) {
    const profiles = await RecipientProfile.find({ userId: { $in: organisations } })
      .select('userId organizationName')
      .lean();
    for (const profile of profiles) {
      if (profile.organizationName) names.set(`${profile.userId}`, profile.organizationName);
    }
  }

  return names;
}

module.exports = {
  askForDonation,
  getDonationAsks,
  askedDonationIds,
  LIVE_DONATION_STATUSES,
};
