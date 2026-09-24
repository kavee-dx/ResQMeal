// backend/src/services/kaveesha-donationExpiryService.js
const Donation = require('../models/kaveesha-Donation');

// Statuses that should NOT be auto-expired even if the availability
// window has passed.
const EXEMPT_STATUSES = ['completed', 'cancelled', 'expired'];

/**
 * Finds all donations whose availabilityEnd has passed and are still
 * in a claimable status, and marks them 'expired'.
 * Returns the number of donations updated.
 */
async function expireOverdueDonations() {
  const now = new Date();

  const result = await Donation.updateMany(
    {
      availabilityEnd: { $lt: now },
      status: { $nin: EXEMPT_STATUSES },
    },
    { $set: { status: 'expired' } }
  );

  return result.modifiedCount ?? result.nModified ?? 0;
}

/**
 * Checks a single donation document and reports whether it should be
 * treated as expired, without writing to the database. Useful right
 * before returning a donation to a client, so a stale cron run never
 * leaks an expired donation as "available".
 */
function isDonationExpired(donation) {
  return (
    donation.availabilityEnd < new Date() &&
    !EXEMPT_STATUSES.includes(donation.status)
  );
}

module.exports = {
  expireOverdueDonations,
  isDonationExpired,
};