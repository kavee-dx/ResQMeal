const mongoose = require('mongoose');
const FoodRequest = require('../models/dushani-foodRequestModel');
const Donation = require('../models/kaveesha-Donation');
const { heldDonationIds, isHeld } = require('./dushani-donationHoldService');

// Sprint item 4 (board side) — a live request is public so any logged-in
// person can see what recipients need, but the recipient's phone number is
// only released to the donor who commits to delivering it.
const PUBLIC_FIELDS =
  'foodType quantity location urgency priority status createdAt expiresAt preferredAt';

// The same statuses the recipient's own search treats as live food.
const DONATION_POOL_STATUSES = ['active', 'expiring', 'pending'];

function toPublicView(request) {
  return {
    id: request._id.toString(),
    foodType: request.foodType,
    quantity: request.quantity,
    location: request.location,
    urgency: request.urgency,
    priority: request.priority,
    status: request.status,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    preferredAt: request.preferredAt ?? null,
  };
}

async function getOpenRequests() {
  const requests = await FoodRequest.find({
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select(PUBLIC_FIELDS)
    .lean();

  // Emergency requests go to the top of the board, newest first within a tier.
  return [
    ...requests.filter((request) => request.urgency === 'URGENT'),
    ...requests.filter((request) => request.urgency !== 'URGENT'),
  ].map(toPublicView);
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
 * two donors tapping Accept at the same moment cannot both take it.
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
