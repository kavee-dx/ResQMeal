const mongoose = require('mongoose');
const FoodRequest = require('../models/dushani-foodRequestModel');
const Donation = require('../models/kaveesha-Donation');
const RecipientProfile = require('../models/dushani-RecipientProfile');
const { heldDonationIds, isHeld } = require('./dushani-donationHoldService');

// Sprint item 4 (board side) — a live request is public so any logged-in
// person can see what recipients need, but the recipient's phone number is
// only released to the donor who commits to delivering it.
const PUBLIC_FIELDS =
  'foodType quantity location details urgency priority status createdAt expiresAt preferredAt recipient';

// A donor's own claimed requests are read back with the recipient's phone and
// the stage timestamps, so the post stays on the donor's board after a refresh
// and can show how far the delivery has come.
const CLAIMED_FIELDS =
  'foodType quantity location details contactNumber urgency priority status createdAt expiresAt preferredAt acceptedAt dispatchedAt fulfilledAt recipient acceptedBy';

// The same statuses the recipient's own search treats as live food.
const DONATION_POOL_STATUSES = ['active', 'expiring', 'pending'];

function toPublicView(request, names) {
  return {
    id: request._id.toString(),
    // Whoever reads the list needs to know whose kitchen or shelter they are
    // answering, so the poster is named — but the number stays private.
    recipientName: names.get(String(request.recipient?._id)) ?? 'A ResQMeal recipient',
    foodType: request.foodType,
    quantity: request.quantity,
    location: request.location,
    details: request.details ?? '',
    urgency: request.urgency,
    priority: request.priority,
    status: request.status,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    preferredAt: request.preferredAt ?? null,
  };
}

/**
 * Individuals sign up with `fullName` on the account. Organisation recipients
 * (charities, community centres, schools) keep their name on the role profile,
 * so only those accounts need the second lookup.
 */
async function posterNames(recipients) {
  const names = new Map();
  const organisations = [];

  for (const person of recipients) {
    if (!person) continue;
    const id = String(person._id);
    if (person.fullName) names.set(id, person.fullName);
    else organisations.push(id);
  }

  if (organisations.length) {
    const profiles = await RecipientProfile.find({ userId: { $in: organisations } })
      .select('userId organizationName')
      .lean();

    for (const profile of profiles) {
      if (profile.organizationName) names.set(String(profile.userId), profile.organizationName);
    }
  }

  return names;
}

async function getOpenRequests({ donorId = null } = {}) {
  const requests = await FoodRequest.find({
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select(PUBLIC_FIELDS)
    .populate({ path: 'recipient', select: 'fullName' })
    .lean();

  // The requests this donor already committed to. They no longer appear in the
  // open (PENDING) pool, but the donor still needs to see them and their
  // progress, so they are merged back into the same board, newest activity
  // first. Passing a non-donor id simply matches nothing.
  const claims = donorId
    ? await FoodRequest.find({
        acceptedBy: donorId,
        status: { $in: ['MATCHED', 'DISPATCHED', 'FULFILLED'] },
      })
        .sort({ updatedAt: -1 })
        .select(CLAIMED_FIELDS)
        .populate({ path: 'recipient', select: 'fullName' })
        .lean()
    : [];

  const names = await posterNames([
    ...requests.map((request) => request.recipient),
    ...claims.map((request) => request.recipient),
  ]);

  const claimViews = claims.map((request) => ({
    ...toPublicView(request, names),
    contactNumber: request.contactNumber ?? '',
    acceptedAt: request.acceptedAt ?? null,
    dispatchedAt: request.dispatchedAt ?? null,
    fulfilledAt: request.fulfilledAt ?? null,
    claimedByMe: true,
  }));

  // Emergency requests go to the top of the list, newest first within a tier.
  const openViews = [
    ...requests.filter((request) => request.urgency === 'URGENT'),
    ...requests.filter((request) => request.urgency !== 'URGENT'),
  ].map((request) => toPublicView(request, names));

  // A donor's own live contributions lead the board, then the open requests.
  return [...claimViews, ...openViews];
}

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

/**
 * Sprint item 10 — the donation the donor says they will deliver with. Optional:
 * a claim without one works exactly as before. It has to be the donor's own,
 * still-live, and not already committed to another request, because the moment
 * it is linked the donation leaves the pool every other recipient searches.
 */
async function resolveLinkedDonation({ donorId, donationId }) {
  if (!donationId) return null;

  if (!mongoose.isValidObjectId(donationId)) {
    fail('That donation does not look right', 400);
  }

  const donation = await Donation.findOne({ _id: donationId, donor: donorId }).lean();
  if (!donation) {
    fail('Pick one of your own live donations to deliver this request', 400);
  }

  const stillEdible =
    new Date(donation.expiryTime ?? 0).getTime() > Date.now() &&
    DONATION_POOL_STATUSES.includes(donation.status);
  if (!stillEdible) fail('That donation is no longer available', 409);

  if (isHeld(donation._id, await heldDonationIds())) {
    fail('That donation is already committed to another request', 409);
  }

  return {
    id: `${donation._id}`,
    foodType: donation.foodType,
    numberOfPortions: Number(donation.numberOfPortions) || null,
  };
}

/**
 * A donor claims an open request. The status filter makes the write atomic, so
 * two donors tapping Accept at the same moment cannot both take it. If a
 * donation is linked, the client can next show volunteer suggestions and let
 * the donor choose before an assignment is created.
 */
async function acceptFoodRequest({ donorId, role, requestId, donationId = null }) {
  if (!donorId || !requestId) fail('donorId and requestId are required', 400);
  if (role !== 'DONOR') fail('Only a donor can accept a food request', 403);

  const linked = await resolveLinkedDonation({ donorId, donationId });

  const claimed = await FoodRequest.findOneAndUpdate(
    { _id: requestId, status: 'PENDING', expiresAt: { $gt: new Date() } },
    {
      $set: {
        status: 'MATCHED',
        acceptedBy: donorId,
        acceptedAt: new Date(),
        linkedDonation: linked?.id ?? null,
      },
    },
    { new: true },
  );

  if (claimed) {
    // The accepted request carries the contact details the donor needs.
    return {
      id: claimed._id.toString(),
      status: claimed.status,
      foodType: claimed.foodType,
      quantity: claimed.quantity,
      location: claimed.location,
      details: claimed.details,
      contactNumber: claimed.contactNumber,
      urgency: claimed.urgency,
      preferredAt: claimed.preferredAt ?? null,
      acceptedAt: claimed.acceptedAt,
      linkedDonation: linked,
    };
  }

  const existing = await FoodRequest.findById(requestId);
  if (!existing) fail('Food request not found', 404);
  if (existing.status !== 'PENDING') {
    fail('This request has already been taken', 409);
  }
  fail('This request has expired', 409);
}

module.exports = { getOpenRequests, acceptFoodRequest };
