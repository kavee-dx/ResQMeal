const User = require('../models/dushani-User');
const PrivacySettings = require('../models/amasha-PrivacySettings');
const districtCoordinates = require('../data/amasha-sriLankaDistricts');

// Donor pins show the district area only — never an exact home/business
// address — and never for donors who turned location sharing off in their
// privacy settings. The system does not track people; this simply lists
// where approved donors are generally based so users can see nearby options.

// Keeps pins from stacking exactly on top of each other within a district —
// this is a display offset only, never used for actual distance calculations.
function jitter(coord) {
  const spread = 0.03; // roughly a few km
  return {
    latitude: coord.latitude + (Math.random() - 0.5) * spread,
    longitude: coord.longitude + (Math.random() - 0.5) * spread,
  };
}

async function getDonorMapPoints() {
  const [donors, hidden] = await Promise.all([
    User.find({
      role: 'DONOR',
      accountStatus: 'active',
      approvalStatus: 'APPROVED',
    })
      .select('fullName district city')
      .lean(),
    PrivacySettings.find({ showLocation: false }).select('userId').lean(),
  ]);

  const hiddenUserIds = new Set(hidden.map((setting) => `${setting.userId}`));

  const points = [];
  let unplaced = 0;

  donors.forEach((donor) => {
    if (hiddenUserIds.has(`${donor._id}`)) {
      return; // privacy opt-out — this donor is not shown on the map
    }
    const base = districtCoordinates[donor.district];
    if (!base) {
      unplaced += 1;
      return;
    }
    const coord = jitter(base);
    points.push({
      id: `${donor._id}`,
      type: 'donor',
      title: donor.fullName || 'Food donor',
      description: [donor.city, donor.district].filter(Boolean).join(', '),
      latitude: coord.latitude,
      longitude: coord.longitude,
      district: donor.district,
      updatedAt: new Date().toISOString(),
    });
  });

  return { points, unplaced };
}

module.exports = { getDonorMapPoints };
