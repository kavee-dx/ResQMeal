// backend/src/routes/kaveesha-loginRoutes.js
// Task 07 — Implement Authentication API Endpoint (route)
// Owner: Kavee
// Git commit: feat(auth): add login route

const express = require("express");
const router = express.Router();

const { login } = require("../controllers/kaveesha-loginController");

router.post("/login", login);

module.exports = router;