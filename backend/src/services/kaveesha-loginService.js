const bcrypt = require("bcryptjs");

const User = require("../models/dushani-User");

async function loginUser({ email, password }) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!normalizedEmail || !password) {
    throw new Error("MISSING_CREDENTIALS");
  }

  // password has `select: false` on the schema, so it must be
  // explicitly requested here.
  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const isMatch = await bcrypt.compare(
    password,
    user.password,
  );

  if (!isMatch) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isVerified) {
    throw new Error("ACCOUNT_NOT_VERIFIED");
  }

  return user;
}

module.exports = { loginUser };