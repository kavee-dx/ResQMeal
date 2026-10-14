// Builds the full description of one delivery for the matching engine:
// donation + the recipient's live request + route points + pickup window + urgency.
// Read-only: it never changes any document.
// Owner: Dilshara

const mongoose = require("mongoose");
const Donation = require("../models/kaveesha-Donation");
const FoodRequest = require("../models/dushani-foodRequestModel");
const User = require("../models/dushani-User");
const Assignment = require("../models/dilshara-Assignment");
const {
  ACTIVE_ASSIGNMENT_STATUSES,
  DELIVERABLE_DONATION_STATUSES,
  MATCHABLE_REQUEST_STATUS,
} = require("../config/dilshara-matching.config");
const { getEffectivePickupWindow } = require("../utils/dilshara-time.util");
const {
  resolveDonationPickupPoint,
  resolveRecipientDropoffPoint,
} = require("../utils/dilshara-locationResolver.util");

const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });

// Returns { ok: true, context } or { ok: false, code, message }.
async function buildDeliveryContext(donationId, { now = new Date() } = {}) {
  if (!mongoose.isValidObjectId(donationId)) {
    return fail("INVALID_DONATION_ID", "The donation id is not valid.");
  }

  // If the donation ever gets exact pickup coordinates, add `pickupLocation` here.
  const donation = await Donation.findById(donationId)
    .select(
      "donor foodType status donationType priority pickupAddress pickupDistrict " +
        "pickupWindowStart pickupWindowEnd availabilityStart availabilityEnd"
    )
    .lean();

  if (!donation) return fail("DONATION_NOT_FOUND", "Donation not found.");

  // Idempotency: a donation with a live assignment is never matched again.
  const existing = await Assignment.findOne({
    donationId: donation._id,
    status: { $in: ACTIVE_ASSIGNMENT_STATUSES },
  })
    .select("_id")
    .lean();
  if (existing) {
    return fail("ALREADY_ASSIGNED", "This donation already has an active assignment.", {
      assignmentId: String(existing._id),
    });
  }

  if (!DELIVERABLE_DONATION_STATUSES.includes(donation.status)) {
    return fail("DONATION_NOT_DELIVERABLE", `A donation that is "${donation.status}" cannot be delivered.`);
  }

  // The live request for this donation — never "the first request found".
  const request = await FoodRequest.findOne({
    linkedDonation: donation._id,
    status: MATCHABLE_REQUEST_STATUS,
  })
    .sort({ acceptedAt: -1 })
    .select("recipient urgency location foodType")
    .lean();
  if (!request) {
    return fail("REQUEST_NOT_FOUND", "No accepted request is waiting for this donation.");
  }

  const recipientUser = await User.findById(request.recipient)
    .select("district city address")
    .lean();

  const pickup = resolveDonationPickupPoint(donation);
  const dropoff = resolveRecipientDropoffPoint(request, recipientUser);
  if (!pickup || !dropoff) {
    return fail(
      "LOCATION_UNRESOLVED",
      `Could not work out the ${!pickup ? "pickup" : "drop-off"} location.`
    );
  }

  const window = getEffectivePickupWindow(donation, now);
  if (!window) return fail("PICKUP_WINDOW_EXPIRED", "The pickup window has already ended.");

  // Urgent if the request is URGENT, the donation is URGENT, or its priority is high.
  const urgentReasons = [];
  if (request.urgency === "URGENT") urgentReasons.push("The recipient's request is urgent");
  if (donation.donationType === "URGENT") urgentReasons.push("The donation is marked urgent");
  if (donation.priority === "high") urgentReasons.push("The donation has high priority");

  return {
    ok: true,
    context: {
      donationId: String(donation._id),
      requestId: String(request._id),
      donorId: String(donation.donor),
      recipientId: String(request.recipient),
      foodType: donation.foodType,
      pickupAddress: donation.pickupAddress || "",
      pickup,
      dropoff,
      window,
      urgent: urgentReasons.length > 0,
      urgentReasons,
      // Places the volunteer's preferred area is compared with.
      areaTexts: [
        donation.pickupDistrict,
        donation.pickupAddress,
        request.location,
        recipientUser?.district,
      ].filter(Boolean),
      now,
    },
  };
}

module.exports = { buildDeliveryContext };