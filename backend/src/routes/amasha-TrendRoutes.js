const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/kaveesha-authMiddleware");
const {
  getDonationsTrend,
  getFulfilledTrend,
  getTrendSummary,
} = require("../controllers/amashaTrendController");

router.get("/donations", requireAuth, getDonationsTrend);
router.get("/fulfilled", requireAuth, getFulfilledTrend);
router.get("/summary", requireAuth, getTrendSummary);

module.exports = router;