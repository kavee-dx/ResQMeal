// backend/src/routes/kaveesha-loginRoutes.js
// Task 07 — Implement Authentication API Endpoint (route)
// Owner: Kavee
// Git commit: feat(auth): add login route

const express = require("express");
const router = express.Router();

const { login } = require("../controllers/kaveesha-loginController");
const { getCurrentUser } = require("../controllers/kaveesha-meController");
const { requireAuth } = require("../middleware/kaveesha-authMiddleware");

router.post("/login", login);

// Protected — requires "Authorization: Bearer <token>"
router.get("/me", requireAuth, getCurrentUser);

module.exports = router;