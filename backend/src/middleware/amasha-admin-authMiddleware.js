const { verifyAdminToken } = require("../utils/amasha-admin-jwt");

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ success: false, message: "Authentication token missing or malformed." });
  }

  try {
    const decoded = verifyAdminToken(token);
    if (decoded.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Admin access required." });
    }
    req.admin = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired session. Please log in again." });
  }
}

module.exports = { requireAdmin };