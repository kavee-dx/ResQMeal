const express = require("express");

const router = express.Router();

const {
  getDeliveryPreferences,
  updateDeliveryPreferences,
} = require("../controllers/dilshara-deliveryPreferences.controller");

const { requireAuth } = require("../middleware/kaveesha-authMiddleware");

router.get("/", requireAuth, getDeliveryPreferences);

router.patch("/", requireAuth, updateDeliveryPreferences);

module.exports = router;