const mongoose = require("mongoose");
const ChatMessage = require("../models/amasha-ChatMessage");
const Donation = require("../models/kaveesha-Donation");
const DonationRequest = require("../models/dushani-donationRequestModel");
const Campaign = require("../models/amasha-Campaign");
const User = require("../models/dushani-User");
const NGOProfile = require("../models/dushani-NGOProfile");
const RecipientProfile = require("../models/dushani-RecipientProfile");

// Matches messages written before the 1-on-1 change (no peerId on the doc).
const NO_PEER = { $or: [{ peerId: null }, { peerId: { $exists: false } }] };

// Every 1-on-1 conversation this user has had, across donation and campaign
// contexts, grouped by (contextType, contextId, partnerId).
//
// Two sources are merged:
//   1. Pair messages — written after the 1-on-1 change, peerId is set.
//   2. Legacy shared-room messages — written before the change (peerId missing).
//      The partner is read from the room itself: for a donation it is the other
//      person who wrote there; for a campaign room the NGO sees every interested
//      sender, and a user sees the NGO that owns the campaign they wrote in.
//      A user's own legacy messages are skipped for grouping (their peer is
//      ambiguous in an old shared room) — they still appear in the history.
async function getConversations(userId) {
  if (!mongoose.isValidObjectId(userId)) return [];

  const myOid = toOid(userId);

  // ---- 1. New 1-on-1 messages (peerId set) ----
  const pairGrouped = await ChatMessage.aggregate([
    {
      $match: {
        peerId: { $ne: null },
        $or: [{ sender: myOid }, { peerId: myOid }],
      },
    },
    pairProjection(myOid),
    { $sort: { createdAt: -1 } },
    groupLatest(),
  ]);

  // ---- 2. Legacy shared-room messages ----
  const [asks, ownDonations, ownCampaigns, writtenCampaignIds] = await Promise.all([
    DonationRequest.find({ recipient: userId }).select("donation").lean(),
    Donation.find({ donor: userId }).select("_id").lean(),
    Campaign.find({ ngoId: userId }).select("_id").lean(),
    ChatMessage.find({ contextType: "campaign", sender: userId, ...NO_PEER })
      .distinct("contextId"),
  ]);

  const donationRoomIds = [
    ...new Set([
      ...asks.map((a) => String(a.donation)),
      ...ownDonations.map((d) => String(d._id)),
    ]),
  ];
  const ownCampaignIdSet = new Set(ownCampaigns.map((c) => String(c._id)));

  const legacy = [];

  // 2a. Donation rooms I own or asked for: partner = the other writer.
  if (donationRoomIds.length) {
    const grouped = await ChatMessage.aggregate([
      {
        $match: {
          contextType: "donation",
          contextId: { $in: donationRoomIds.map(toOid) },
          ...NO_PEER,
        },
      },
      pairProjection(myOid),
      { $match: { partnerId: { $ne: null } } },
      { $sort: { createdAt: -1 } },
      groupLatest(),
    ]);
    legacy.push(...grouped);
  }

  // 2b. Campaign rooms I own (NGO view): partner = every interested sender.
  if (ownCampaignIdSet.size) {
    const grouped = await ChatMessage.aggregate([
      {
        $match: {
          contextType: "campaign",
          contextId: { $in: [...ownCampaignIdSet].map(toOid) },
          ...NO_PEER,
        },
      },
      pairProjection(myOid),
      { $match: { partnerId: { $ne: null } } },
      { $sort: { createdAt: -1 } },
      groupLatest(),
    ]);
    legacy.push(...grouped);
  }

  // 2c. Campaign rooms I wrote in but do not own (user view): one thread per
  // campaign whose partner is the owning NGO. Grouped without partnerId here;
  // the NGO id is attached during shaping below.
  const userSideCampaignIds = writtenCampaignIds
    .map(String)
    .filter((id) => !ownCampaignIdSet.has(id));

  if (userSideCampaignIds.length) {
    const grouped = await ChatMessage.aggregate([
      {
        $match: {
          contextType: "campaign",
          contextId: { $in: userSideCampaignIds.map(toOid) },
          ...NO_PEER,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { contextType: "$contextType", contextId: "$contextId" },
          last: { $first: "$$ROOT" },
        },
      },
    ]);

    // The partner of a user-side campaign thread is the owning NGO, so set it
    // here — the merge below then dedups against real pair conversations.
    const owningCampaigns = await Campaign.find({
      _id: { $in: userSideCampaignIds.map(toOid) },
    })
      .select("ngoId")
      .lean();
    const ngoByCampaign = new Map(
      owningCampaigns.map((c) => [String(c._id), String(c.ngoId)])
    );

    legacy.push(
      ...grouped
        .map((r) => ({
          _id: {
            ...r._id,
            partnerId: ngoByCampaign.get(String(r._id.contextId)) ?? null,
          },
          last: r.last,
        }))
        .filter((r) => r._id.partnerId)
    );
  }

  // ---- Merge; a real pair conversation always wins over its legacy twin ----
  const byKey = new Map();
  for (const r of [...pairGrouped, ...legacy]) {
    const key = `${r._id.contextType}:${r._id.contextId}:${r._id.partnerId}`;
    if (!byKey.has(key)) byKey.set(key, r);
  }
  const grouped = [...byKey.values()];
  if (!grouped.length) return [];

  // Resolve donation titles/codes and campaign titles in bulk.
  const donationIds = grouped
    .filter((r) => r._id.contextType === "donation")
    .map((r) => r._id.contextId);
  const campaignIds = grouped
    .filter((r) => r._id.contextType === "campaign")
    .map((r) => r._id.contextId);

  const [donations, campaigns] = await Promise.all([
    donationIds.length
      ? Donation.find({ _id: { $in: donationIds } })
          .select("donor foodType donationCode")
          .lean()
      : [],
    campaignIds.length
      ? Campaign.find({ _id: { $in: campaignIds } })
          .select("ngoId title")
          .lean()
      : [],
  ]);

  const donationById = new Map(donations.map((d) => [String(d._id), d]));
  const campaignById = new Map(campaigns.map((c) => [String(c._id), c]));

  // Resolve display names for every partner, sender and (2c) NGO owner.
  const nameIds = new Set();
  for (const r of grouped) {
    if (r._id.partnerId) nameIds.add(String(r._id.partnerId));
    nameIds.add(String(r.last.sender));
  }
  for (const c of campaigns) nameIds.add(String(c.ngoId));
  const names = await resolveNames([...nameIds]);

  const shapeLast = (last) => ({
    text: last.text,
    createdAt: last.createdAt,
    senderName: names.get(String(last.sender)) || "A ResQMeal member",
    fromMe: String(last.sender) === String(userId),
  });

  const conversations = [];
  for (const r of grouped) {
    const { contextType, contextId, partnerId } = r._id;
    const last = r.last;
    const cid = String(contextId);

    if (contextType === "donation") {
      const d = donationById.get(cid);
      if (!d || !partnerId) continue; // donation deleted — drop from list
      conversations.push({
        contextType,
        contextId: cid,
        peerId: String(partnerId),
        title: d.foodType || "Rescue chat",
        subtitle: d.donationCode ? `Rescue chat · #${d.donationCode}` : "Rescue chat",
        counterpart: names.get(String(partnerId)) || "A ResQMeal member",
        lastMessage: shapeLast(last),
      });
      continue;
    }

    const c = campaignById.get(cid);
    if (!c || !partnerId) continue; // campaign deleted — drop from list

    conversations.push({
      contextType,
      contextId: cid,
      peerId: String(partnerId),
      title: c.title,
      subtitle: "Campaign chat",
      counterpart: names.get(String(partnerId)) || "NGO",
      lastMessage: shapeLast(last),
    });
  }

  return conversations.sort(
    (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
  );
}

// Derive the conversation partner from my point of view: when I wrote the
// message the peer is peerId; when the peer wrote it the peer is the sender.
// Legacy rows (peerId missing) end up null when I was the writer, which the
// caller filters out.
function pairProjection(myOid) {
  return {
    $project: {
      contextType: 1,
      contextId: 1,
      partnerId: {
        $cond: [{ $eq: ["$sender", myOid] }, "$peerId", "$sender"],
      },
      createdAt: 1,
      text: 1,
      sender: 1,
    },
  };
}

function groupLatest() {
  return {
    $group: {
      _id: {
        contextType: "$contextType",
        contextId: "$contextId",
        partnerId: "$partnerId",
      },
      last: { $first: "$$ROOT" },
    },
  };
}

function toOid(id) {
  return new mongoose.Types.ObjectId(id);
}

// Signup names live on User.fullName; organisation names on the role profiles
// (same rule the chat history endpoint uses for sender names).
async function resolveNames(ids) {
  const names = new Map();
  if (!ids.length) return names;

  const users = await User.find({ _id: { $in: ids } }).select("fullName role").lean();
  const orgIds = [];
  for (const u of users) {
    if (u.fullName) names.set(String(u._id), u.fullName);
    else orgIds.push(u._id);
  }

  if (orgIds.length) {
    const [ngos, recipients] = await Promise.all([
      NGOProfile.find({ userId: { $in: orgIds } })
        .select("userId organizationName")
        .lean(),
      RecipientProfile.find({ userId: { $in: orgIds } })
        .select("userId organizationName")
        .lean(),
    ]);
    for (const p of [...ngos, ...recipients]) {
      if (p.organizationName) names.set(String(p.userId), p.organizationName);
    }
  }

  return names;
}

module.exports = { getConversations };
