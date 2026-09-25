const Donation = require('../models/kaveesha-Donation');
const districtCoordinates = require('../data/amasha-sriLankaDistricts');

const CANDIDATE_STATUSES = ['active', 'expiring', 'pending'];

// Keeps pins from stacking exactly on top of each other within a district —
// this is a display offset only, never used for actual distance calculations.
function jitter(coord) {
  const spread = 0.03; // roughly a few km
  return {
    latitude: coord.latitude + (Math.random() - 0.5) * spread,
    longitude: coord.longitude + (Math.random() - 0.5) * spread,
  };
}

async function getDonationMapPoints({ now = Date.now() } = {}) {
  const donations = await Donation.find({
    status: { $in: CANDIDATE_STATUSES },
    expiryTime: { $gt: new Date(now) },
  })
    .select('foodType foodCategory pickupDistrict pickupAddress status expiryTime donationCode')
    .lean();

  const points = [];
  let unplaced = 0;

  donations.forEach((donation) => {
    const base = districtCoordinates[donation.pickupDistrict];
    if (!base) {
      unplaced += 1;
      return;
    }
    const coord = jitter(base);
    points.push({
      id: `${donation._id}`,
      type: 'available_food',
      title: donation.foodType || 'Food donation',
      description: donation.donationCode ? `Ref: ${donation.donationCode}` : donation.pickupAddress || '',
      latitude: coord.latitude,
      longitude: coord.longitude,
      pickupDistrict: donation.pickupDistrict,
      status: donation.status,
      updatedAt: new Date().toISOString(),
    });
  });

  return { points, unplaced };
}

module.exports = { getDonationMapPoints };