const router = require("express").Router();

const { requireAuth } = require("../middleware/kaveesha-authMiddleware");
const ctrl = require("../controllers/amasha-ngoMonitoringController");

// The dashboard feeds are for NGO coordinator accounts only.
function requireNgo(req, res, next) {
  if (req.user?.role !== "NGO") {
    return res.status(403).json({ message: "NGO access required" });
  }
  return next();
}

router.get("/emergency-requests", requireAuth, requireNgo, ctrl.getEmergencyRequests);

router.get("/donations", requireAuth, requireNgo, ctrl.getDonationsOverview);

router.get("/community-stats", requireAuth, requireNgo, ctrl.getCommunityStats);

module.exports = router;
