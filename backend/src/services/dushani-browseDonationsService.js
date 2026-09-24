const FoodRequest = require('../models/dushani-foodRequestModel');
const Donation = require('../models/kaveesha-Donation.model');
const User = require('../models/dushani-User');
const DonorProfile = require('../models/dushani-DonorProfile');
const { effectiveStatus } = require('./dushani-requestProgressService');
const { MATCH_CRITERIA, rankDonations, foodTokens } = require('./dushani-matchRequestService');

// Sprint item 4 — Browse Donations. Donors post food; a recipient comes here to
// search that live pool by food type, by how much they can carry, and by how far
// the pickup is. Donations that answer one of the recipient's own open requests
// are ranked first, and an URGENT request's matches sit above everything else.
const CANDIDATE_STATUSES = ['active', 'expiring', 'pending'];
const CANDIDATE_LIMIT = 200;

// The food groups the request form uses, so a recipient can filter the donation
// pool with the same words they typed their request with. Donations are free
// text, so a group matches either the donor's own category or a food stem.
const FOOD_GROUPS = [
  { key: 'Rice', stems: ['rice', 'curry', 'dhal'] },
  { key: 'Bread', stems: ['bread', 'biscuit', 'flour'] },
  { key: 'Vegetables', stems: ['vegetable', 'carrot', 'beans', 'greens', 'salad'] },
  { key: 'Fruits', stems: ['fruit', 'banana', 'apple', 'mango', 'orange'] },
  { key: 'Water', stems: ['water', 'juice', 'milk'] },
  { key: 'Dry Foods', stems: ['dhal', 'lentil', 'rice', 'flour', 'sugar', 'oil', 'noodles', 'biscuit'] },
];

// How far the recipient is willing to travel for the pickup. There are no map
// coordinates on a donation, so "near" means the district they registered in.
const DISTANCES = ['own-district', 'anywhere'];

function normalize(value) {
  return `${value ?? ''}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function samePlace(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  return Boolean(a) && a === b;
}

function mentions(haystack, needle) {
  const text = normalize(haystack);
  const value = normalize(needle);
  return Boolean(text) && Boolean(value) && text.includes(value);
}

/**
 * How far a pickup sits from the recipient's own address. There are no map
 * coordinates on a donation, so distance is read from the district/town text —
 * and the donor's own structured `pickupDistrict` wins over a free-text address,
 * because "Galle" plus a Colombo street number is a typo, not two places.
 */
function distanceFrom(viewer, donation) {
  const pickup = `${donation.pickupDistrict ?? ''} ${donation.pickupAddress ?? ''}`;
  if (viewer.district && samePlace(viewer.district, donation.pickupDistrict)) {
    return { tier: 0, label: `Same district (${viewer.district})`, ownDistrict: true };
  }
  if (viewer.city && samePlace(viewer.city, donation.pickupDistrict)) {
    return { tier: 0, label: `Same town (${viewer.city})`, ownDistrict: true };
  }
  if (donation.pickupDistrict) {
    return { tier: 2, label: `Other district (${donation.pickupDistrict})`, ownDistrict: false };
  }
  if (viewer.city && mentions(pickup, viewer.city)) {
    return { tier: 1, label: `Same town (${viewer.city})`, ownDistrict: true };
  }
  if (viewer.district && mentions(pickup, viewer.district)) {
    return { tier: 1, label: `Within ${viewer.district}`, ownDistrict: true };
  }
  return { tier: 3, label: 'Pickup area not given', ownDistrict: false };
}

function groupOf(donation) {
  const haystack = `${donation.foodType ?? ''} ${donation.foodCategory ?? ''}`;
  const category = normalize(donation.foodCategory);
  const direct = FOOD_GROUPS.find((group) => normalize(group.key) === category);
  if (direct) return direct.key;
  const tokens = foodTokens(haystack);
  const match = FOOD_GROUPS.find((group) => group.stems.some((stem) => tokens.includes(stem)));
  return match ? match.key : 'Other';
}

function inGroup(donation, group) {
  return donation.foodGroup === group;
}

function readyWhen(donation, now) {
  if (donation.status === 'pending') return 'Not prepared yet';
  if (donation.pickupWindowStart && new Date(donation.pickupWindowStart).getTime() > now) {
    return 'Ready later today';
  }
  return 'Ready to collect now';
}

function donationView(donation, donorName, viewer, now) {
  const distance = distanceFrom(viewer, donation);
  return {
    id: `${donation._id}`,
    donationCode: donation.donationCode ?? null,
    foodType: donation.foodType,
    foodCategory: donation.foodCategory ?? 'Uncategorized',
    foodGroup: groupOf(donation),
    photoUrl: donation.photoUrl ?? null,
    quantity: Number(donation.quantity) || null,
    numberOfPortions: Number(donation.numberOfPortions) || null,
    storageCondition: donation.storageCondition ?? null,
    pickupAddress: donation.pickupAddress ?? '',
    pickupDistrict: donation.pickupDistrict ?? '',
    pickupWindowStart: donation.pickupWindowStart ?? null,
    expiryTime: donation.expiryTime ?? null,
    status: donation.status,
    readyWhen: readyWhen(donation, now),
    distanceLabel: distance.label,
    distanceTier: distance.tier,
    inOwnDistrict: distance.ownDistrict,
    donorName,
  };
}

// A donor shows up by the name they registered with: a business donor has a
// business name on their profile, an individual donor only has their own name.
async function donorNames(donations) {
  const ids = Array.from(new Set(donations.map((donation) => `${donation.donor}`).filter(Boolean)));
  if (ids.length === 0) return {};

  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: ids } }).select('fullName').lean(),
    DonorProfile.find({ userId: { $in: ids } }).select('userId businessName').lean(),
  ]);

  const business = {};
  profiles.forEach((profile) => {
    if (profile.businessName) business[`${profile.userId}`] = profile.businessName;
  });

  const names = {};
  users.forEach((user) => {
    names[`${user._id}`] = business[`${user._id}`] || user.fullName || 'A ResQMeal donor';
  });
  return names;
}

/**
 * The donation pool as one recipient sees it: only live, still-edible donations,
 * narrowed by the filters they picked, and ordered so that what answers an open
 * request — an urgent one above all — comes out on top.
 */
async function browseDonations({
  recipientId,
  search = '',
  group = '',
  minPortions = null,
  distance = 'anywhere',
  sort = 'suggested',
  now = Date.now(),
} = {}) {
  if (!recipientId) {
    const error = new Error('A signed-in recipient is required');
    error.statusCode = 401;
    throw error;
  }

  const [viewer, donations, requests] = await Promise.all([
    User.findById(recipientId).select('district city').lean(),
    Donation.find({
      status: { $in: CANDIDATE_STATUSES },
      expiryTime: { $gt: new Date(now) },
    })
      .sort({ expiryTime: 1 })
      .limit(CANDIDATE_LIMIT)
      .lean(),
    FoodRequest.find({ recipient: recipientId }).lean(),
  ]);

  const reference = viewer || { district: '', city: '' };
  const names = await donorNames(donations);

  // Score the pool against every request this recipient still has waiting, so
  // each donation can say which need it answers. URGENT requests win the tie.
  const waiting = requests
    .map((request) => ({ ...request, status: effectiveStatus(request, now) }))
    .filter((request) => request.status === 'PENDING');

  const bestByDonation = {};
  waiting.forEach((request) => {
    rankDonations(request, donations, reference, now).forEach((match) => {
      // "Answers this request" has to mean the donation carries something the
      // request asked for, otherwise a far-off leftover would claim to help.
      if (match.breakdown.foodType === 0) return;
      const current = bestByDonation[match.donationId];
      const better =
        !current ||
        (request.urgency === 'URGENT' && current.urgency !== 'URGENT') ||
        (request.urgency === current.urgency && match.score > current.score);
      if (better) {
        bestByDonation[match.donationId] = {
          requestId: `${request._id}`,
          requestFood: request.foodType,
          urgency: request.urgency,
          urgent: request.urgency === 'URGENT',
          score: match.score,
          percent: match.percent,
          reasons: match.reasons,
        };
      }
    });
  });

  const query = normalize(search);
  const groupKey = FOOD_GROUPS.some((entry) => entry.key === group) ? group : '';
  const wantedPortions = Number.isFinite(Number(minPortions)) && Number(minPortions) > 0 ? Number(minPortions) : null;
  const withinDistrict = DISTANCES.includes(distance) && distance !== 'anywhere';

  const items = donations
    .map((donation) => ({
      ...donationView(donation, names[`${donation.donor}`] || 'A ResQMeal donor', reference, now),
      answering: bestByDonation[`${donation._id}`] || null,
    }))
    .filter((item) => {
      if (query) {
        const haystack = normalize(
          `${item.foodType} ${item.foodCategory} ${item.pickupAddress} ${item.pickupDistrict} ${item.donorName}`
        );
        const words = query.split(' ').filter(Boolean);
        if (!words.every((word) => haystack.includes(word))) return false;
      }
      if (groupKey && !inGroup(item, groupKey)) return false;
      if (wantedPortions !== null) {
        const portions = item.numberOfPortions ?? item.quantity;
        if (portions === null || portions < wantedPortions) return false;
      }
      if (withinDistrict && !item.inOwnDistrict) return false;
      return true;
    });

  const byExpiry = (left, right) =>
    new Date(left.expiryTime ?? 0) - new Date(right.expiryTime ?? 0) ||
    left.id.localeCompare(right.id);

  const sorters = {
    // Urgent need first, then any request this donation answers, then the rest.
    suggested: (left, right) => {
      const leftUrgent = left.answering?.urgent ? 1 : 0;
      const rightUrgent = right.answering?.urgent ? 1 : 0;
      if (leftUrgent !== rightUrgent) return rightUrgent - leftUrgent;
      const leftScore = left.answering?.score ?? -1;
      const rightScore = right.answering?.score ?? -1;
      if (leftScore !== rightScore) return rightScore - leftScore;
      return byExpiry(left, right);
    },
    nearest: (left, right) =>
      left.distanceTier - right.distanceTier || byExpiry(left, right),
    expiring: byExpiry,
    newest: (left, right) => right.id.localeCompare(left.id),
  };

  const sorted = [...items].sort(sorters[sort] || sorters.suggested);

  return {
    criteria: MATCH_CRITERIA,
    viewer: { district: reference.district, city: reference.city },
    filters: {
      search: `${search ?? ''}`.trim(),
      group: groupKey || '',
      minPortions: wantedPortions,
      distance: DISTANCES.includes(distance) ? distance : 'anywhere',
      sort: sorters[sort] ? sort : 'suggested',
      foodGroups: FOOD_GROUPS.map((entry) => entry.key),
      distances: DISTANCES,
    },
    stats: {
      total: sorted.length,
      urgent: sorted.filter((item) => item.answering?.urgent).length,
      answering: sorted.filter((item) => item.answering).length,
      nearby: sorted.filter((item) => item.inOwnDistrict).length,
      expiringSoon: sorted.filter((item) => {
        const hours = (new Date(item.expiryTime).getTime() - now) / 3_600_000;
        return Number.isFinite(hours) && hours <= 3;
      }).length,
    },
    donations: sorted,
  };
}

module.exports = {
  browseDonations,
  FOOD_GROUPS,
  DISTANCES,
  groupOf,
  distanceFrom,
};
