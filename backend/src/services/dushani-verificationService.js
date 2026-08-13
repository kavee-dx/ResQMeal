
const User = require("../models/dushani-User");
const { generateVerificationCode, getExpiryDate } = require("../utils/dushani-otp");
const { sendVerificationEmail } = require("../utils/dushani-email");

async function verifyAccount(email, code) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+verificationCode +verificationCodeExpires"
  );

  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.isVerified) throw new Error("ALREADY_VERIFIED");

  if (!user.verificationCode || user.verificationCode !== code) {
    throw new Error("INVALID_CODE");
  }

  if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
    throw new Error("CODE_EXPIRED");
  }

  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save();

  return user;
}

async function resendVerificationCode(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.isVerified) throw new Error("ALREADY_VERIFIED");

  user.verificationCode = generateVerificationCode();
  user.verificationCodeExpires = getExpiryDate(15);
  await user.save();

  await sendVerificationEmail(normalizedEmail, user.verificationCode);

  return user;
}

module.exports = { verifyAccount, resendVerificationCode };
