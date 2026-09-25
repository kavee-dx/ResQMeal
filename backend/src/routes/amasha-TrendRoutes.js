const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // adjust to your teammate's actual JWT middleware filename
const {
  getDonationsTrend,
  getFulfilledTrend,
  getTrendSummary,
} = require("../controllers/amashaTrendController");

router.get("/donations", auth, getDonationsTrend);
router.get("/fulfilled", auth, getFulfilledTrend);
router.get("/summary", auth, getTrendSummary);

module.exports = router;