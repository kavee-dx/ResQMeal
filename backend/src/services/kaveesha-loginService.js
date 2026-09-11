const bcrypt = require("bcryptjs");

const User = require("../models/dushani-User");

// A pre-hashed dummy value, so bcrypt.compare always has real work
// to do even when no user was found — keeps response timing
// consistent between "no such email" and "wrong password", so
// an attacker can't tell which case happened by measuring speed.
const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8bTfeKmzB6D8v5A4gY.G7Y3q7z0i9K";

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

  // Always compare against something, real hash or dummy,
  // so timing doesn't reveal whether the user exists.
  const isMatch = await bcrypt.compare(
    password,
    user ? user.password : DUMMY_HASH,
  );

  if (!user || !isMatch) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.isVerified) {
    throw new Error("ACCOUNT_NOT_VERIFIED");
  }

  if (user.approvalStatus === "PENDING") {
    throw new Error("ACCOUNT_PENDING_APPROVAL");
  }

  if (user.approvalStatus === "REJECTED") {
    throw new Error("ACCOUNT_REJECTED");
  }

  return user;
}

module.exports = { loginUser };
