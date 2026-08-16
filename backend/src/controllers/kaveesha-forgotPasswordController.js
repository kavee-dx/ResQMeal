const jwt = require("jsonwebtoken");
const User = require("../models/dushani-User");
const {
  generateVerificationCode,
  getExpiryDate,
} = require("../utils/dushani-otp");
const { sendPasswordResetEmail } = require("../utils/kaveesha-resendMailer");

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always responds success (even if email doesn't exist) to avoid leaking
 * which emails are registered.
 */
async function requestPasswordReset(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email address.",
      });
    }

    const user = await User.findOne({ email });

    if (user) {
      const code = generateVerificationCode();
      user.resetPasswordCode = code;
      user.resetPasswordExpires = getExpiryDate(15);
      await user.save();

      await sendPasswordResetEmail({
        to: user.email,
        name: user.fullName,
        code,
      });
    }

    return res.json({
      success: true,
      message:
        "If an account exists for that email, we've sent a reset code to your inbox.",
    });
  } catch (err) {
    console.error("requestPasswordReset error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
}

/**
 * POST /api/auth/verify-reset-otp
 * Body: { email, code }
 * Verifies the OTP and issues a short-lived reset token used to
 * authorize the actual password change.
 */
async function verifyResetOtp(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const code = String(req.body.code || "").trim();

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Please enter the 6-digit code sent to your email.",
      });
    }

    const user = await User.findOne({ email }).select(
      "+resetPasswordCode +resetPasswordExpires",
    );

    if (
      !user ||
      !user.resetPasswordCode ||
      user.resetPasswordCode !== code ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "That code is invalid or has expired. Please request a new one.",
      });
    }

    const resetToken = jwt.sign(
      { email: user.email, purpose: "password-reset" },
      process.env.JWT_RESET_SECRET,
      { expiresIn: "10m" },
    );

    return res.json({
      success: true,
      message: "Code verified successfully.",
      resetToken,
    });
  } catch (err) {
    console.error("verifyResetOtp error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
}

module.exports = { requestPasswordReset, verifyResetOtp };