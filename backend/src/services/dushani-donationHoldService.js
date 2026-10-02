const FoodRequest = require('../models/dushani-foodRequestModel');

// Sprint item 10 — a donor who claims a request can name the donation they will
// deliver it with. That donation is held out of the pool other recipients
// search, and the hold is *derived* from the live request instead of written
// onto the donor's own document: nothing a recipient does changes a donation's
// lifecycle status, and cancelling the request drops the hold on its own.
//
// FULFILLED keeps the hold: that food really went to the recipient, so the
// donation is not available again. CANCELLED releases it, which is exactly the
// case this item is about.
const HELD_REQUEST_STATUSES = ['MATCHED', 'DISPATCHED', 'FULFILLED'];

/**
 * Ids of the donations currently committed to someone's request.
 * @returns {Promise<Set<string>>}
 */
async function heldDonationIds() {
  const rows = await FoodRequest.find({
    status: { $in: HELD_REQUEST_STATUSES },
    linkedDonation: { $ne: null },
  })
    .select('linkedDonation')
    .lean();

  return new Set(rows.map((row) => `${row.linkedDonation}`));
}

function isHeld(donationId, heldIds) {
  return heldIds.has(`${donationId}`);
}

module.exports = { heldDonationIds, isHeld, HELD_REQUEST_STATUSES };
