const express = require("express");
const router = express.Router();

const {
  deleteAccount,
} = require("../controllers/amasha-accountDeletionController");
const { requireAuth } = require("../middleware/kaveesha-authMiddleware");

router.delete("/account/me", requireAuth, deleteAccount);

module.exports = router;