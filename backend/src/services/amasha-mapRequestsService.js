const FoodRequest = require('../models/dushani-foodRequestModel');
const districtCoordinates = require('../data/amasha-sriLankaDistricts');

// FoodRequest.location is free text (like Donation.pickupAddress), so it's
// matched against known district names the same way — no coordinates exist
// on the model, so this is the same approximation used for donations.

function normalize(value) {
  return `${value ?? ''}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchDistrict(locationText) {
  const text = normalize(locationText);
  if (!text) return null;
  const match = Object.keys(districtCoordinates).find((district) => text.includes(normalize(district)));
  return match || null;
}

// Keeps pins from stacking exactly on top of each other within a district —
// this is a display offset only, never used for actual distance calculations.
function jitter(coord) {
  const spread = 0.03; // roughly a few km
  return {
    latitude: coord.latitude + (Math.random() - 0.5) * spread,
    longitude: coord.longitude + (Math.random() - 0.5) * spread,
  };
}

async function getRequestMapPoints({ now = Date.now() } = {}) {
  const requests = await FoodRequest.find({
    status: 'PENDING',
    expiresAt: { $gt: new Date(now) },
  })
    .select('foodType urgency location expiresAt')
    .lean();

  const points = [];
  let unplaced = 0;

  requests.forEach((request) => {
    const district = matchDistrict(request.location);
    const base = district && districtCoordinates[district];
    if (!base) {
      unplaced += 1;
      return;
    }
    const coord = jitter(base);
    points.push({
      id: `${request._id}`,
      type: 'recipient',
      title: request.foodType || 'Food request',
      description: request.urgency === 'URGENT' ? 'Urgent request' : 'Open request',
      latitude: coord.latitude,
      longitude: coord.longitude,
      district,
      urgency: request.urgency,
      updatedAt: new Date().toISOString(),
    });
  });

  return { points, unplaced };
}

module.exports = { getRequestMapPoints };