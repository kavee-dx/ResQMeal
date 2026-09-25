const express = require("express");
const router = express.Router();
const { getAssignmentProgressForDonation } = require("../controllers/dilshara-assignment.controller");
const {
  getCurrentAssignment,
  updateAssignmentStatus,
  createTestAssignment,
} = require("../controllers/dilshara-assignment.controller");
const { requireAuth } = require("../middleware/kaveesha-authMiddleware");

router.get("/current", requireAuth, getCurrentAssignment);
router.patch("/:id/status", requireAuth, updateAssignmentStatus);
router.get("/by-donation/:donationId", requireAuth, getAssignmentProgressForDonation);
// TEMPORARY — remove once donor request → AI matching creates real assignments
router.post("/test-create", requireAuth, createTestAssignment);

module.exports = router;