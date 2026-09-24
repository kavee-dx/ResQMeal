const FoodRequest = require('../models/dushani-foodRequestModel');

// Sprint item 4 (board side) — a live request is public so any logged-in
// person can see what recipients need, but the recipient's phone number is
// only released to the donor who commits to delivering it.
const PUBLIC_FIELDS =
  'foodType quantity location urgency priority status createdAt expiresAt preferredAt';

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
 * A donor claims an open request. The status filter makes the write atomic, so
 * two donors tapping Accept at the same moment cannot both take it.
 */
async function acceptFoodRequest({ donorId, role, requestId }) {
  if (!donorId || !requestId) fail('donorId and requestId are required', 400);
  if (role !== 'DONOR') fail('Only a donor can accept a food request', 403);

  const claimed = await FoodRequest.findOneAndUpdate(
    { _id: requestId, status: 'PENDING', expiresAt: { $gt: new Date() } },
    {
      $set: {
        status: 'MATCHED',
        acceptedBy: donorId,
        acceptedAt: new Date(),
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
