const mongoose = require("mongoose");
const Donation = require("../models/kaveesha-Donation");
const DonationRequest = require("../models/dushani-donationRequestModel");
const Campaign = require("../models/amasha-Campaign");

// Who may read or post in a 1-on-1 chat conversation.
// Returns:
//   "ok"       — both participants are valid for this context
//   "missing"  — bad id, or no such donation/campaign
//   "denied"   — the context exists but this pair is not allowed to chat
//
// Donation rescue chat (1-on-1):
//   - I am the donor  → peerId must be a recipient who has asked for this donation
//   - peerId is the donor → I must have asked for this donation
//   - neither of us is the donor → denied
//
// Campaign chat (1-on-1):
//   - I am the NGO owner  → peerId can be any registered user
//   - peerId is the NGO owner → I can be any registered user
//   - neither of us owns the campaign → denied
async function canAccessChat({ userId, contextType, contextId, peerId }) {
  if (!userId || !contextType || !contextId || !peerId) {
    return "denied";
  }

  if (!mongoose.isValidObjectId(contextId)) {
    return "missing";
  }
  if (!mongoose.isValidObjectId(peerId)) {
    return "denied";
  }

  if (contextType === "donation") {
    const donation = await Donation.findById(contextId).select("donor").lean();
    if (!donation) return "missing";

    const donorId = String(donation.donor);
    const iAmDonor = donorId === String(userId);
    const peerIsDonor = donorId === String(peerId);

    if (iAmDonor) {
      // peerId must have an active ask on this donation
      const ask = await DonationRequest.findOne({
        donation: contextId,
        recipient: peerId,
      })
        .select("_id")
        .lean();
      return ask ? "ok" : "denied";
    }

    if (peerIsDonor) {
      // I must have an active ask on this donation
      const ask = await DonationRequest.findOne({
        donation: contextId,
        recipient: userId,
      })
        .select("_id")
        .lean();
      return ask ? "ok" : "denied";
    }

    // Neither of us is the donor — not a valid pair
    return "denied";
  }

  if (contextType === "campaign") {
    const campaign = await Campaign.findById(contextId).select("ngoId").lean();
    if (!campaign) return "missing";

    const ngoId = String(campaign.ngoId?._id ?? campaign.ngoId);

    // Valid pair: one side must be the NGO owner
    if (String(userId) === ngoId || String(peerId) === ngoId) return "ok";

    return "denied";
  }

  return "denied";
}

module.exports = { canAccessChat };
