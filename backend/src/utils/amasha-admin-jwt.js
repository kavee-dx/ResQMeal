const jwt = require("jsonwebtoken");

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || "8h";

if (!ADMIN_JWT_SECRET) {
  console.warn("[Admin JWT] ADMIN_JWT_SECRET is not set — admin tokens will fail to sign/verify.");
}

function signAdminToken(admin) {
  return jwt.sign({ id: admin._id, role: admin.role }, ADMIN_JWT_SECRET, {
    expiresIn: ADMIN_JWT_EXPIRES_IN,
  });
}

function verifyAdminToken(token) {
  return jwt.verify(token, ADMIN_JWT_SECRET);
}

module.exports = { signAdminToken, verifyAdminToken };