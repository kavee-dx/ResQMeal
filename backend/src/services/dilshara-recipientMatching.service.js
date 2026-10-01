// backend/src/services/dilshara-recipientMatching.service.js
// Matches a donation against open FoodRequests and ranks them by criterion.
// Owner: Dilshara

const FoodRequest = require("../models/dushani-foodRequestModel");
const RecipientProfile = require("../models/dushani-RecipientProfile");

const CRITERIA = ["smart", "location", "urgency", "food", "quantity", "people"];

// Decide with the teammate who owns the transaction rules.
// true  -> requests bigger than the donation are still shown ("Needs 100 kg / You have 50 kg")
// false -> only requests the donation can fully cover are shown
const ALLOW_PARTIAL_QUANTITY = true;

// Smart Match weights (total 100) — weighted rules, not machine learning.
const WEIGHTS = { food: 40, location: 25, quantity: 15, urgency: 10, time: 10 };
const SMART_MIN_SCORE = 25;

/* ---------------------------- text helpers ---------------------------- */

const normalize = (v) =>
  String(v || "").toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();

const tokens = (v) => normalize(v).split(" ").filter((t) => t.length > 2);

// 1 = same, 0.9 = one contains the other, 0.6 = shares a word, 0 = nothing
function textOverlap(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const setB = new Set(tokens(b));
  return tokens(a).some((t) => setB.has(t)) ? 0.6 : 0;
}

/* --------------------------- quantity helpers ------------------------- */

// FoodRequest.quantity is a String like "30 kg", so we parse it.
function parseQuantity(text) {
  const m = String(text || "").match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]*)/);
  if (!m) return null;
  let amount = parseFloat(m[1]);
  let unit = (m[2] || "").toLowerCase();
  if (unit === "g") { amount /= 1000; unit = "kg"; }
  if (unit === "ml") { amount /= 1000; unit = "l"; }
  if (unit === "kgs") unit = "kg";
  return { amount, unit };
}

const formatQty = (q) => `${Math.round(q.amount * 100) / 100} ${q.unit}`.trim();

/* ----------------------------- sub-scores ----------------------------- */
// Every sub-score returns 0..1

function foodScore(donation, request, profile) {
  const sources = [donation.foodType];
  if (donation.foodCategory && donation.foodCategory !== "Uncategorized") {
    sources.push(donation.foodCategory);
  }
  let best = 0;
  for (const s of sources) {
    best = Math.max(best, textOverlap(s, request.foodType));
    for (const req of profile?.foodRequirements || []) {
      best = Math.max(best, 0.9 * textOverlap(s, req));
    }
  }
  return best;
}

function locationScore(donation, request) {
  return Math.max(
    textOverlap(donation.pickupDistrict, request.location),
    0.8 * textOverlap(donation.pickupAddress, request.location)
  );
}

function quantityInfo(donation, request) {
  const have = parseQuantity(`${donation.quantity} ${donation.quantityUnit}`);
  const need = parseQuantity(request.quantity);
  if (!have || !need || (need.unit && need.unit !== have.unit)) {
    return { score: 0.5, comparable: false, have, need };
  }
  const score = have.amount >= need.amount ? 1 : have.amount / need.amount;
  return { score, comparable: true, have, need, covers: have.amount >= need.amount };
}

function urgencyRank(request) {
  return (request.urgency === "URGENT" ? 2 : 0) + (request.priority === "HIGH" ? 1 : 0);
}

function timeScore(donation, request) {
  if (!request.preferredAt) return 0.7; // emergency requests are needed straight away
  const t = new Date(request.preferredAt).getTime();
  const start = donation.pickupWindowStart ? new Date(donation.pickupWindowStart).getTime() : null;
  const end = donation.pickupWindowEnd ? new Date(donation.pickupWindowEnd).getTime() : null;
  if (start && end && t >= start && t <= end) return 1;
  if (t <= new Date(donation.expiryTime).getTime()) return 0.5;
  return 0;
}

/* ------------------------------ scoring ------------------------------- */

function buildEntry(donation, request, profile) {
  const food = foodScore(donation, request, profile);
  const location = locationScore(donation, request);
  const qty = quantityInfo(donation, request);
  const time = timeScore(donation, request);
  const rank = urgencyRank(request);

  const smartScore =
    food * WEIGHTS.food +
    location * WEIGHTS.location +
    qty.score * WEIGHTS.quantity +
    (rank / 3) * WEIGHTS.urgency +
    time * WEIGHTS.time;

  return { request, profile, food, location, qty, time, rank, smartScore };
}

function smartReason(e) {
  const parts = [];
  if (e.food >= 0.9) parts.push("Strong food match");
  else if (e.food > 0) parts.push("Partial food match");
  if (e.location >= 0.9) parts.push("same area");
  else if (e.location > 0) parts.push("nearby area");
  if (e.qty.comparable && e.qty.covers) parts.push("quantity covered");
  if (e.request.urgency === "URGENT") parts.push("urgent request");
  if (!parts.length) return "Possible match";
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function reasonFor(criteria, e) {
  switch (criteria) {
    case "location":
      return e.location >= 0.9 ? "Same area as your pickup" : e.location > 0 ? "Nearby area" : "Different area";
    case "urgency":
      return e.request.urgency === "URGENT" ? "Urgent request" : e.request.priority === "HIGH" ? "High priority" : "Normal request";
    case "food":
      return e.food >= 0.9 ? "Food type matches" : "Partly matches the food needed";
    case "quantity":
      return e.qty.comparable ? (e.qty.covers ? "Your donation covers this request" : "Partial fulfilment") : "Quantity not directly comparable";
    case "people":
      return `${e.profile?.peopleNeedingFood ?? 0} people need food`;
    default:
      return smartReason(e);
  }
}

/* --------------------------- response shaping ------------------------- */

// Only donor-safe fields. Registration number, authorized person, position
// and the recipient's contact number are deliberately left out.
function toSuggestion(criteria, e) {
  const { request, profile, qty } = e;
  const user = request.recipient;
  return {
    requestId: String(request._id),
    recipientId: String(user._id),
    recipientType: profile?.recipientType || null,
    displayName: profile?.organizationName || user.fullName || "Recipient",
    foodType: request.foodType,
    quantity: request.quantity,
    quantityNote:
      qty.comparable && !qty.covers
        ? `Needs ${formatQty(qty.need)} / You have ${formatQty(qty.have)}`
        : null,
    location: request.location,
    peopleNeedingFood: profile?.peopleNeedingFood ?? null,
    urgency: request.urgency,
    priority: request.priority,
    foodRequirements: profile?.foodRequirements || [],
    specialRequirements: profile?.specialRequirements || "",
    details: request.details || "",
    preferredAt: request.preferredAt,
    expiresAt: request.expiresAt,
    matchReason: reasonFor(criteria, e),
  };
}

/* ------------------------------ main entry ---------------------------- */

async function getRecipientSuggestions(donation, criteria) {
  // 1. Candidates: PENDING and not expired (never the donor's own requests)
  const requests = await FoodRequest.find({
    status: "PENDING",
    expiresAt: { $gt: new Date() },
    recipient: { $ne: donation.donor },
  })
    .populate("recipient", "fullName")
    .lean();

  const valid = requests.filter((r) => r.recipient);

  // 2. Enrich with profiles in ONE query (avoids N+1)
  const profiles = await RecipientProfile.find({
    userId: { $in: valid.map((r) => r.recipient._id) },
  })
    .select("-organizationRegistrationNumber -authorizedPerson -position")
    .lean();
  const profileByUser = new Map(profiles.map((p) => [String(p.userId), p]));

  // 3. Score everything
  let entries = valid.map((r) =>
    buildEntry(donation, r, profileByUser.get(String(r.recipient._id)))
  );

  // 4. Apply criterion: filter and/or sort
  const soonestExpiry = (a, b) =>
    new Date(a.request.expiresAt) - new Date(b.request.expiresAt);

  switch (criteria) {
    case "smart":
      entries = entries.filter((e) => e.smartScore >= SMART_MIN_SCORE);
      entries.sort((a, b) => b.smartScore - a.smartScore || soonestExpiry(a, b));
      break;
    case "location":
      entries.sort((a, b) => b.location - a.location || soonestExpiry(a, b));
      break;
    case "urgency":
      entries.sort((a, b) => b.rank - a.rank || soonestExpiry(a, b));
      break;
    case "food":
      entries = entries.filter((e) => e.food > 0);
      entries.sort((a, b) => b.food - a.food || soonestExpiry(a, b));
      break;
    case "quantity":
      if (!ALLOW_PARTIAL_QUANTITY) {
        entries = entries.filter((e) => !e.qty.comparable || e.qty.covers);
      }
      entries.sort((a, b) => b.qty.score - a.qty.score || soonestExpiry(a, b));
      break;
    case "people":
      entries.sort(
        (a, b) =>
          (b.profile?.peopleNeedingFood ?? 0) - (a.profile?.peopleNeedingFood ?? 0) ||
          soonestExpiry(a, b)
      );
      break;
  }

  return entries.map((e) => toSuggestion(criteria, e));
}

module.exports = { getRecipientSuggestions, CRITERIA };