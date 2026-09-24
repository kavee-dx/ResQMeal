const FoodRequest = require('../models/dushani-foodRequestModel');
const Donation = require('../models/kaveesha-Donation.model');
const User = require('../models/dushani-User');
const { effectiveStatus } = require('./dushani-requestProgressService');

// Sprint item 4 — Donation–Request Matching. Four criteria decide how well a
// donation fits a request, and they are weighted so the ranking is explainable:
// what the recipient asked for matters most, then getting enough of it, then
// how close the pickup is, then whether the food is ready when it is needed.
const MATCH_CRITERIA = [
  {
    key: 'foodType',
    label: 'Food type',
    weight: 40,
    description: 'The donation carries the items the request asked for.',
  },
  {
    key: 'quantity',
    label: 'Quantity',
    weight: 20,
    description: 'The donation has enough portions for what is needed.',
  },
  {
    key: 'proximity',
    label: 'Proximity',
    weight: 25,
    description: 'The pickup sits in the same district or city as the delivery address.',
  },
  {
    key: 'urgency',
    label: 'Urgency and timing',
    weight: 15,
    description: 'The food is ready to collect when the request needs it.',
  },
];

const TOTAL_WEIGHT = MATCH_CRITERIA.reduce((sum, criterion) => sum + criterion.weight, 0);

// The request form and the donation form do not share a food list, so matching
// leans on word stems: "Cooked Rice" and "Parboiled rice" are both rice.
const FOOD_STEMS = [
  'rice',
  'bread',
  'water',
  'fruit',
  'banana',
  'vegetable',
  'carrot',
  'beans',
  'dhal',
  'lentil',
  'egg',
  'milk',
  'curry',
  'meat',
  'chicken',
  'fish',
  'noodles',
  'biscuit',
  'flour',
  'sugar',
  'oil',
];

// Words that say nothing about the food itself.
const STOP_WORDS = new Set([
  'cooked',
  'raw',
  'fresh',
  'packets',
  'packet',
  'kg',
  'kgs',
  'grams',
  'g',
  'litres',
  'litre',
  'bottles',
  'bottle',
  'slices',
  'slice',
  'portions',
  'cups',
  'and',
  'with',
  'other',
  'items',
  'the',
  'a',
]);

const CANDIDATE_STATUSES = ['active', 'expiring', 'pending'];
const CANDIDATE_LIMIT = 200;

function normalize(value) {
  return `${value ?? ''}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Meaningful food words in a piece of text: known stems first, then leftovers. */
function foodTokens(value) {
  const text = normalize(value);
  if (!text) return [];
  const stems = FOOD_STEMS.filter((stem) => text.includes(stem));
  const words = text
    .split(' ')
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !FOOD_STEMS.includes(word));
  return Array.from(new Set([...stems, ...words]));
}

// "Cooked Rice - 6 packets, Carrot - 2 kg" -> [{ name, amount, unit }]
function parseRequestedItems(foodType, quantity) {
  const names = `${foodType ?? ''}`
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  const lines = `${quantity ?? ''}`.split(/,\s(?=[^,]+\s-)/);

  return names.map((name, index) => {
    const line = lines[index] && lines[index].includes(' - ') ? lines[index] : '';
    const amountMatch = line.match(/-\s*([0-9]+(?:\.[0-9]+)?)/);
    return {
      name,
      amount: amountMatch ? Number(amountMatch[1]) : null,
      unit: amountMatch ? normalize(line.slice(line.indexOf('-') + 1)).replace(/^[0-9.]+\s*/, '') : '',
    };
  });
}

function neededPortions(items) {
  const amounts = items.map((item) => item.amount).filter((amount) => Number.isFinite(amount));
  if (amounts.length === 0) return null;
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

// Donations are counted in portions, so the request's own units (packets, kg,
// slices) all collapse into "how many servings does this cover".
function donationPortions(donation) {
  const portions = Number(donation.numberOfPortions);
  if (Number.isFinite(portions) && portions > 0) return portions;
  const quantity = Number(donation.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
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

function scoreFoodType(items, donation) {
  const haystack = `${donation.foodType ?? ''} ${donation.foodCategory ?? ''}`;
  const donationTokens = foodTokens(haystack);
  if (donationTokens.length === 0) return { ratio: 0, matchedNames: [] };

  const matchedNames = items
    .filter((item) => foodTokens(item.name).some((token) => donationTokens.includes(token)))
    .map((item) => item.name);

  // Nothing asked for is a weak signal, so an unknown item only counts once.
  const wanted = items.length || 1;
  return { ratio: Math.min(matchedNames.length / wanted, 1), matchedNames };
}

function scoreQuantity(items, donation) {
  const available = donationPortions(donation);
  const needed = neededPortions(items);

  if (available === null) return { ratio: 0.2, needed, available };
  if (needed === null) return { ratio: 0.6, needed, available };
  return { ratio: Math.min(available / needed, 1), needed, available };
}

function scoreProximity(request, donation, profile) {
  const recipientDistrict = profile?.district ?? '';
  const recipientCity = profile?.city ?? '';
  const pickupText = `${donation.pickupDistrict ?? ''} ${donation.pickupAddress ?? ''}`;
  const deliveryText = `${request.location ?? ''} ${recipientDistrict} ${recipientCity}`;

  if (recipientDistrict && samePlace(recipientDistrict, donation.pickupDistrict)) {
    return { ratio: 1, label: `Same district (${recipientDistrict})` };
  }
  if (recipientCity && samePlace(recipientCity, donation.pickupDistrict)) {
    return { ratio: 0.9, label: `Same town (${recipientCity})` };
  }
  if (recipientCity && mentions(donation.pickupAddress, recipientCity)) {
    return { ratio: 0.85, label: `Same town (${recipientCity})` };
  }
  if (recipientDistrict && mentions(pickupText, recipientDistrict)) {
    return { ratio: 0.75, label: `Within ${recipientDistrict}` };
  }
  if (mentions(recipientCity, donation.pickupDistrict)) {
    return { ratio: 0.7, label: `Nearby (${donation.pickupDistrict})` };
  }
  return { ratio: 0.15, label: 'Further away' };
}

function scoreUrgency(request, donation, now) {
  const expiryTime = donation.expiryTime ? new Date(donation.expiryTime).getTime() : null;
  const preferredAt = request.preferredAt ? new Date(request.preferredAt).getTime() : null;
  const readyNow =
    !donation.pickupWindowStart || new Date(donation.pickupWindowStart).getTime() <= now;
  const urgent = request.urgency === 'URGENT';

  if (urgent) {
    // An emergency needs food within hours, so "ready to collect" is the whole
    // question; a donation still marked pending cannot be picked up yet.
    if (donation.status === 'pending') return { ratio: 0.3, label: 'Not prepared yet' };
    if (!readyNow) return { ratio: 0.6, label: 'Ready later today' };
    return { ratio: 1, label: 'Ready now' };
  }

  if (preferredAt === null) return { ratio: 0.8, label: 'Timing unclear' };
  if (expiryTime !== null && expiryTime < preferredAt) {
    return { ratio: 0.35, label: 'Expires before it is needed' };
  }
  if (donation.status === 'pending') return { ratio: 0.5, label: 'Not prepared yet' };
  return { ratio: 1, label: 'Available when needed' };
}

/**
 * Score one donation against one request. Returns null when the donation cannot
 * help at all (no food overlap at all *and* a different district), so the list
 * stays honest instead of padding itself with unrelated posts.
 */
function scoreDonation(donation, context) {
  const { items, request, profile, now } = context;

  const food = scoreFoodType(items, donation);
  const quantity = scoreQuantity(items, donation);
  const proximity = scoreProximity(request, donation, profile);
  const timing = scoreUrgency(request, donation, now);

  if (food.ratio === 0 && proximity.ratio < 0.7) return null;

  const ratios = { foodType: food.ratio, quantity: quantity.ratio, proximity: proximity.ratio, urgency: timing.ratio };
  const score = MATCH_CRITERIA.reduce(
    (sum, criterion) => sum + ratios[criterion.key] * criterion.weight,
    0,
  );

  const reasons = [];
  if (food.matchedNames.length > 0) reasons.push(`Covers ${food.matchedNames.join(', ')}`);
  if (quantity.available !== null && quantity.needed !== null) {
    reasons.push(
      quantity.available >= quantity.needed
        ? `${quantity.available} portions — enough for ${quantity.needed}`
        : `${quantity.available} of about ${quantity.needed} portions`,
    );
  } else if (quantity.available !== null) {
    reasons.push(`${quantity.available} portions on offer`);
  }
  reasons.push(proximity.label);
  reasons.push(timing.label);

  return {
    donationId: `${donation._id}`,
    donationCode: donation.donationCode ?? null,
    foodType: donation.foodType,
    foodCategory: donation.foodCategory ?? 'Uncategorized',
    photoUrl: donation.photoUrl ?? null,
    quantity: donation.quantity,
    numberOfPortions: donation.numberOfPortions ?? null,
    pickupAddress: donation.pickupAddress ?? '',
    pickupDistrict: donation.pickupDistrict ?? '',
    status: donation.status,
    priority: donation.priority,
    expiryTime: donation.expiryTime ?? null,
    score: Math.round(score),
    percent: Math.round((score / TOTAL_WEIGHT) * 100),
    breakdown: {
      foodType: Math.round(food.ratio * MATCH_CRITERIA[0].weight),
      quantity: Math.round(quantity.ratio * MATCH_CRITERIA[1].weight),
      proximity: Math.round(proximity.ratio * MATCH_CRITERIA[2].weight),
      urgency: Math.round(timing.ratio * MATCH_CRITERIA[3].weight),
    },
    reasons,
  };
}

function rankDonations(request, donations, profile, now = Date.now()) {
  const items = parseRequestedItems(request.foodType, request.quantity);
  const context = { items, request, profile, now };

  return donations
    .map((donation) => scoreDonation(donation, context))
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.score - left.score ||
        new Date(left.expiryTime ?? 0) - new Date(right.expiryTime ?? 0) ||
        `${left.donationId}`.localeCompare(`${right.donationId}`),
    );
}

async function loadCandidates(now) {
  return Donation.find({
    status: { $in: CANDIDATE_STATUSES },
    expiryTime: { $gt: new Date(now) },
  })
    .sort({ expiryTime: 1 })
    .limit(CANDIDATE_LIMIT)
    .lean();
}

function requestView(request) {
  return {
    id: `${request._id}`,
    foodType: request.foodType,
    quantity: request.quantity,
    location: request.location,
    urgency: request.urgency,
    status: request.status,
    preferredAt: request.preferredAt ?? null,
    expiresAt: request.expiresAt ?? null,
  };
}

/** Every live donation ranked against one of this recipient's own requests. */
async function getRequestMatches({ recipientId, requestId, now = Date.now() }) {
  const request = await FoodRequest.findOne({ _id: requestId, recipient: recipientId }).lean();
  if (!request) {
    const error = new Error('Food request not found');
    error.statusCode = 404;
    throw error;
  }
  if (effectiveStatus(request, now) !== 'PENDING') {
    return {
      criteria: MATCH_CRITERIA,
      request: { ...requestView(request), matched: false },
      matches: [],
      note: 'This request is no longer waiting for food.',
    };
  }

  const [profile, donations] = await Promise.all([
    User.findById(recipientId).select('district city').lean(),
    loadCandidates(now),
  ]);

  const matches = rankDonations({ ...request, status: 'PENDING' }, donations, profile, now);
  return {
    criteria: MATCH_CRITERIA,
    request: { ...requestView(request), matched: matches.length > 0 },
    matches,
  };
}

/**
 * Suggestions for every request the recipient still has waiting. An emergency
 * request always comes out on top — that food is needed within hours, so its
 * matches are what should be seen first.
 */
async function getRecipientSuggestions({ recipientId, limit = 3, now = Date.now() }) {
  const [requests, profile, donations] = await Promise.all([
    FoodRequest.find({ recipient: recipientId }).lean(),
    User.findById(recipientId).select('district city').lean(),
    loadCandidates(now),
  ]);

  const waiting = requests
    .map((request) => ({ ...request, status: effectiveStatus(request, now) }))
    .filter((request) => request.status === 'PENDING');

  const groups = waiting.map((request) => {
    const matches = rankDonations(request, donations, profile, now).slice(0, limit);
    return {
      request: requestView(request),
      urgent: request.urgency === 'URGENT',
      score: matches.length > 0 ? matches[0].score : 0,
      matches,
    };
  });

  groups.sort((left, right) => {
    if (left.urgent !== right.urgent) return left.urgent ? -1 : 1;
    if (right.score !== left.score) return right.score - left.score;
    return new Date(left.request.expiresAt ?? 0) - new Date(right.request.expiresAt ?? 0);
  });

  return {
    criteria: MATCH_CRITERIA,
    groups,
    // Flattened ranking, emergency suggestions first, for the browse screen.
    suggestions: groups
      .flatMap((group) => group.matches.map((match) => ({ ...match, requestId: group.request.id, urgent: group.urgent })))
      .sort((left, right) => (left.urgent === right.urgent ? right.score - left.score : left.urgent ? -1 : 1)),
  };
}

module.exports = {
  MATCH_CRITERIA,
  parseRequestedItems,
  foodTokens,
  rankDonations,
  getRequestMatches,
  getRecipientSuggestions,
};
