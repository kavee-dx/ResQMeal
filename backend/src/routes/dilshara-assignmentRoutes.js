
const express = require("express");

const router = express.Router();

const {
  getCurrentAssignment,
  getAssignmentSummary,
  updateAssignmentStatus,
  getAssignmentProgressForDonation,
  createTestAssignment,
} = require("../controllers/dilshara-assignment.controller");

const {
  requireAuth,
} = require("../middleware/kaveesha-authMiddleware");

router.get("/current", requireAuth, getCurrentAssignment);

router.get("/summary", requireAuth, getAssignmentSummary);

router.patch("/:id/status", requireAuth, updateAssignmentStatus);

router.get(
  "/by-donation/:donationId",
  requireAuth,
  getAssignmentProgressForDonation
);

// TEMPORARY TEST ENDPOINT
router.post("/test-create", requireAuth, createTestAssignment);

module.exports = router;