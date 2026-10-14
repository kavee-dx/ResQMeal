const FoodRequest = require("../models/dushani-foodRequestModel");
const Donation = require("../models/kaveesha-Donation");
const Campaign = require("../models/amasha-Campaign");
const User = require("../models/dushani-User");

// NGO dashboard monitoring feeds. The frontend types (amasha-request.ts /
// amasha-donation.ts) use lowercase statuses, while the models store
// uppercase request statuses and a different donation vocabulary — every
// value is mapped here so the dashboard cards render real data.

/**
 * GET /api/ngo/emergency-requests
 * Open and recent food requests for the Request Status Monitoring section.
 */
exports.getEmergencyRequests = async (req, res) => {
  try {
    // CANCELLED requests are noise for a coordinator board.
    const requests = await FoodRequest.find({
      status: { $in: ["PENDING", "MATCHED", "DISPATCHED", "FULFILLED", "EXPIRED"] },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("recipient", "fullName")
      .lean();

    const now = Date.now();

    const items = requests.map((r) => {
      let status = "pending";
      if (r.status === "MATCHED" || r.status === "DISPATCHED") status = "accepted";
      else if (r.status === "FULFILLED") status = "fulfilled";
      else if (r.status === "EXPIRED") status = "expired";

      // Urgency for the card badges: URGENT requests are always "urgent";
      // normal ones turn "soon" once less than 6h of their window is left.
      let urgency = "fresh";
      if (r.urgency === "URGENT") {
        urgency = "urgent";
      } else if (r.expiresAt) {
        const remaining = new Date(r.expiresAt).getTime() - now;
        if (remaining > 0 && remaining <= 6 * 60 * 60 * 1000) urgency = "soon";
      }

      return {
        id: String(r._id),
        requesterName: r.recipient?.fullName || "A recipient",
        foodNeeded: r.foodType,
        quantity: r.quantity,
        status,
        urgency,
        location: r.location,
        requestedAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : "",
        fulfilledAt: r.fulfilledAt ? r.fulfilledAt.toISOString() : undefined,
      };
    });

    res.json(items);
  } catch (err) {
    console.error("getEmergencyRequests error:", err);
    res.status(500).json({ message: "Failed to load emergency requests" });
  }
};

/**
 * GET /api/ngo/donations
 * Recent donations for the Donation Status Monitoring section.
 */
exports.getDonationsOverview = async (req, res) => {
  try {
    const donations = await Donation.find({
      status: { $in: ["pending", "active", "completed", "expired"] },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("donor", "fullName")
      .lean();

    const items = donations.map((d) => ({
      id: String(d._id),
      donorName: d.donor?.fullName || "A donor",
      foodType: d.foodType,
      quantity: `${d.quantity ?? 0} ${d.quantityUnit || "kg"}`,
      // The frontend card knows available/pending/accepted/expired/delivered.
      status:
        d.status === "active"
          ? "available"
          : d.status === "completed"
            ? "delivered"
            : d.status, // pending | expired pass through
      donatedAt: d.createdAt.toISOString(),
    }));

    res.json(items);
  } catch (err) {
    console.error("getDonationsOverview error:", err);
    res.status(500).json({ message: "Failed to load donations" });
  }
};

/**
 * GET /api/ngo/community-stats
 * Headline numbers for the Community Stats cards on the NGO dashboard.
 */
exports.getCommunityStats = async (req, res) => {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    const [activeCampaigns, openRequests, activeVolunteers, activeDonors, expiringSoon] =
      await Promise.all([
        Campaign.countDocuments({ status: "active" }),
        FoodRequest.countDocuments({ status: { $in: ["PENDING", "MATCHED", "DISPATCHED"] } }),
        User.countDocuments({ role: "VOLUNTEER", accountStatus: "active" }),
        User.countDocuments({ role: "DONOR", accountStatus: "active" }),
        Donation.countDocuments({ status: "active", availabilityEnd: { $gt: now, $lte: soon } }),
      ]);

    res.json({
      activeCampaigns,
      emergencyRequests: openRequests,
      activeVolunteers,
      activeDonors,
      expiringSoon,
    });
  } catch (err) {
    console.error("getCommunityStats error:", err);
    res.status(500).json({ message: "Failed to load community stats" });
  }
};
