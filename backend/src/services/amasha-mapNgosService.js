const User = require('../models/dushani-User');
const NGOProfile = require('../models/dushani-NGOProfile');
const PrivacySettings = require('../models/amasha-PrivacySettings');
const districtCoordinates = require('../data/amasha-sriLankaDistricts');

// NGO pins are placed at the organization's district center so users can
// find nearby NGO partners for coordination. NGOs that turned location
// sharing off in their privacy settings are excluded.

// Keeps pins from stacking exactly on top of each other within a district —
// this is a display offset only, never used for actual distance calculations.
function jitter(coord) {
  const spread = 0.03; // roughly a few km
  return {
    latitude: coord.latitude + (Math.random() - 0.5) * spread,
    longitude: coord.longitude + (Math.random() - 0.5) * spread,
  };
}

async function getNgoMapPoints() {
  const [ngos, orgProfiles, hidden] = await Promise.all([
    User.find({
      role: 'NGO',
      accountStatus: 'active',
      approvalStatus: 'APPROVED',
    })
      .select('district city')
      .lean(),
    NGOProfile.find().select('userId organizationName').lean(),
    PrivacySettings.find({ showLocation: false }).select('userId').lean(),
  ]);

  const orgNames = new Map(
    orgProfiles.map((profile) => [`${profile.userId}`, profile.organizationName]),
  );
  const hiddenUserIds = new Set(hidden.map((setting) => `${setting.userId}`));

  const points = [];
  let unplaced = 0;

  ngos.forEach((ngo) => {
    if (hiddenUserIds.has(`${ngo._id}`)) {
      return; // privacy opt-out — this NGO is not shown on the map
    }
    const base = districtCoordinates[ngo.district];
    if (!base) {
      unplaced += 1;
      return;
    }
    const coord = jitter(base);
    points.push({
      id: `${ngo._id}`,
      type: 'ngo',
      title: orgNames.get(`${ngo._id}`) || 'NGO partner',
      description: [ngo.city, ngo.district].filter(Boolean).join(', '),
      latitude: coord.latitude,
      longitude: coord.longitude,
      district: ngo.district,
      updatedAt: new Date().toISOString(),
    });
  });

  return { points, unplaced };
}

module.exports = { getNgoMapPoints };
