// backend/src/utils/kaveesha-jwt.js
// Task 08 — Secure Session Handling (JWT helpers)
// Owner: Kavee
// Git commit: feat(auth): add JWT token generation and verification helpers

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

if (!JWT_SECRET) {
  console.warn(
    "[JWT] JWT_SECRET is not set in .env — tokens will fail to sign/verify."
  );
}

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };