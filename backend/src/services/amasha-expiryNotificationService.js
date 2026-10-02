const Donation = require("../models/kaveesha-Donation"); // adjust to your Donation model file
const { notify } = require("./amasha-notificationService");
const {
  EXPIRY_ALERT_WINDOW_HOURS,
} = require("../constants/amasha-notificationEvents");

// Warn donors whose donations end within EXPIRY_ALERT_WINDOW_HOURS.
// Safe to run repeatedly: the dedupe key allows one warning per donation.
async function notifyExpiringDonations() {
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRY_ALERT_WINDOW_HOURS * 3600 * 1000);

  const donations = await Donation.find({
    status: { $in: ["active", "pending"] }, // adjust to your status values
    availabilityEnd: { $gt: now, $lte: soon },
  }).lean();

  let created = 0;
  for (const d of donations) {
    const r = await notify("DONATION_EXPIRING_SOON", [d.donorId || d.donor], {
      donationId: d._id,
      foodType: d.foodType,
      availabilityEnd: d.availabilityEnd,
    });
    created += r.created;
  }
  return { checked: donations.length, created };
}

// Notify donors after their donations were moved to 'expired'.
// Pass the donations (lean docs) that were just expired.
async function notifyExpiredDonations(donations = []) {
  let created = 0;
  for (const d of donations) {
    const r = await notify("DONATION_EXPIRED", [d.donorId || d.donor], {
      donationId: d._id,
      foodType: d.foodType,
    });
    created += r.created;
  }
  return { created };
}

module.exports = { notifyExpiringDonations, notifyExpiredDonations };