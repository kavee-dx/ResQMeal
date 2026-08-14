// backend/src/controllers/kaveesha-meController.js
// Story 03 follow-up — protected route to verify the JWT middleware chain
// Owner: Kavee
// Git commit: feat(auth): add protected /me route for testing sessions
//
// req.user is set by kaveesha-authMiddleware.js after verifying the token.
// This route just echoes it back, plus fetches the fresh user record.

const User = require("../models/dushani-User");

// GET /api/auth/me  (requires Authorization: Bearer <token>)
async function getCurrentUser(req, res) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      tokenPayload: req.user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong.",
    });
  }
}

module.exports = { getCurrentUser };