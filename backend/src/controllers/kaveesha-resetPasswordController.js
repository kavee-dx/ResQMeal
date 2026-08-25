const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/dushani-User");

/**
 * POST /api/auth/reset-password
 * Body: { resetToken, newPassword }
 * Verifies the short-lived reset token, hashes and updates the password,
 * then invalidates the reset code so it can't be reused.
 */
async function resetPassword(req, res) {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Missing reset token or new password.",
      });
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and include uppercase, lowercase and a number.",
      });
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_RESET_SECRET);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Your reset session has expired. Please start again.",
      });
    }

    if (payload.purpose !== "password-reset") {
      return res.status(400).json({
        success: false,
        message: "Invalid reset request.",
      });
    }

    const user = await User.findOne({ email: payload.email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Account not found.",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "Your password has been reset successfully.",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
}

module.exports = { resetPassword };