const bcrypt = require("bcryptjs");
const Admin = require("../models/amasha-admin");

async function loginAdmin({ email, password }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error("MISSING_CREDENTIALS");

  const admin = await Admin.findOne({ email: normalizedEmail }).select("+password");
  if (!admin) throw new Error("INVALID_CREDENTIALS");

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) throw new Error("INVALID_CREDENTIALS");

  return admin;
}

module.exports = { loginAdmin };