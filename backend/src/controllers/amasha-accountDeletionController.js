const bcrypt = require("bcryptjs");

const User = require("../models/dushani-User");
const PrivacySettings = require("../models/PrivacySettings");
const NotificationSettings = require("../models/NotificationSettings");

// DELETE /api/settings/account/me
// body: { password: string }
async function deleteAccount(req, res) {
  try {
    const userId = req.user.id;
    const { password } = req.body || {};

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please re-enter your password to confirm deletion.",
      });
    }

    // password has `select: false` on the schema, so fetch it explicitly
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password. Account was not deleted.",
      });
    }

    // Remove settings docs first, then the user record itself.
    // If your donations/requests/delivery collections reference this
    // user, prefer anonymizing those (e.g. set donorId to a generic
    // "deleted user" placeholder) instead of deleting them outright,
    // so other users' history/records stay intact. Add that step here
    // once those models exist.
    await PrivacySettings.deleteOne({ userId });
    await NotificationSettings.deleteOne({ userId });
    await User.deleteOne({ _id: userId });

    return res.status(200).json({
      success: true,
      message: "Your account has been permanently deleted.",
    });
  } catch (error) {
    console.error("deleteAccount error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not delete account. Please try again.",
    });
  }
}

module.exports = { deleteAccount };