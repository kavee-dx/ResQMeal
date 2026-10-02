const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/kaveesha-authMiddleware");
const uploadCampaignImage = require("../middleware/amasha-uploadCampaignImage");
const { createCampaign } = require("../controllers/amasha-campaignController");
const User = require("../models/dushani-User");

// Set to false while testing if no admin has approved your NGO account yet
const REQUIRE_APPROVED_NGO = true;

// Checks the account in the database (the token only carries id and role,
// and the account may have been restricted or rejected since login).
async function ngoOnly(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select(
      "role accountStatus approvalStatus"
    );

    if (!user || user.role !== "NGO") {
      return res
        .status(403)
        .json({ success: false, message: "Only NGO accounts can post campaigns." });
    }
    if (user.accountStatus !== "active") {
      return res
        .status(403)
        .json({ success: false, message: "Your account is not active." });
    }
    if (REQUIRE_APPROVED_NGO && user.approvalStatus !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Your NGO account must be approved before you can post campaigns.",
      });
    }
    next();
  } catch (error) {
    console.error("ngoOnly check failed:", error);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
}

// POST /api/campaigns
router.post("/", requireAuth, ngoOnly, uploadCampaignImage, createCampaign);

module.exports = router;