// backend/src/middleware/kaveesha-authMiddleware.js
// Task 08 — Secure Session Handling (route protection middleware)
// Owner: Kavee
// Git commit: feat(auth): implement secure session/token handling
//
// Usage on any route that needs a logged-in user:
//   const { requireAuth } = require("../middleware/kaveesha-authMiddleware");
//   router.get("/profile", requireAuth, getProfile);
//
// req.user is set to the decoded token payload: { id, role, iat, exp }

const { verifyToken } = require("../utils/kaveesha-jwt");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token missing or malformed.",
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session. Please log in again.",
    });
  }
}

module.exports = { requireAuth };