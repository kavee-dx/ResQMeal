const express = require("express");
const router = express.Router();
const {
  getCurrentAssignment,
  getAssignmentSummary,
  previewMatching,
  updateAssignmentStatus,
  getAssignmentProgressForDonation,
  createTestAssignment,
  getVolunteerSuggestions,
  assignSuggestedVolunteer,
} = require("../controllers/dilshara-assignment.controller");
const { requireAuth } = require("../middleware/kaveesha-authMiddleware");

router.get("/current", requireAuth, getCurrentAssignment);
router.get("/summary", requireAuth, getAssignmentSummary);
router.get("/suggestions/:donationId", requireAuth, getVolunteerSuggestions);
router.post("/suggestions/:donationId/assign", requireAuth, assignSuggestedVolunteer);
// DEVELOPMENT ONLY — volunteer matching preview. Read-only: ranks eligible
// volunteers and explains rejections without creating assignments or sending
// notifications. Disabled automatically when NODE_ENV=production (also see
// isMatchingPreviewEnabled in config/dilshara-matching.config.js); locally it
// is on by default and can be opted out with ENABLE_MATCHING_PREVIEW=false.
//
// Invoke locally (the JWT must belong to the donor who owns the donation, and
// no secrets belong in this file — obtain a token by logging in via
// POST /api/auth/login):
//   GET /api/assignments/match-preview/<donationId>
//   Authorization: Bearer <JWT>
//
// Responses: 200 with { eligibleCount, rejectedCount, ranked[], rejected[] },
// 400 INVALID_DONATION_ID, 403 not your donation, 404 DONATION_NOT_FOUND or
// disabled, 422 { code } when the delivery context is invalid (e.g.
// ALREADY_ASSIGNED, DONATION_NOT_DELIVERABLE, PICKUP_WINDOW_EXPIRED).
router.get("/match-preview/:donationId", requireAuth, previewMatching);
router.patch("/:id/status", requireAuth, updateAssignmentStatus);
router.get("/by-donation/:donationId", requireAuth, getAssignmentProgressForDonation);
// TEMPORARY — remove once matching creates real assignments
router.post("/test-create", requireAuth, createTestAssignment);

module.exports = router;