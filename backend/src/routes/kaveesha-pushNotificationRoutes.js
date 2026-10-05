const express = require("express");

const User = require("../models/dushani-User");

const {
  requireAuth,
} = require("../middleware/kaveesha-authMiddleware");

const router = express.Router();

/**
 * Get authenticated user ID.
 *
 * Your JWT middleware stores the decoded token in:
 * req.user = { id, role, iat, exp }
 */
function getUserId(req) {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id
  );
}

/*
|--------------------------------------------------------------------------
| Register Expo Push Token
|--------------------------------------------------------------------------
|
| POST /api/notifications/push-token
|
*/
router.post(
  "/push-token",
  requireAuth,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user ID not found.",
        });
      }

      const {
        token,
        platform,
        deviceId,
      } = req.body;

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          message:
            "A valid Expo Push Token is required.",
        });
      }

      if (
        platform &&
        !["android", "ios"].includes(platform)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Platform must be android or ios.",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      if (!Array.isArray(user.expoPushTokens)) {
        user.expoPushTokens = [];
      }

      /*
       * Check whether this exact token already exists.
       */
      const existingToken =
        user.expoPushTokens.find(
          (item) => item.token === token
        );

      if (existingToken) {
        existingToken.enabled = true;
        existingToken.lastRegisteredAt =
          new Date();

        if (platform) {
          existingToken.platform = platform;
        }

        if (deviceId !== undefined) {
          existingToken.deviceId =
            deviceId || null;
        }
      } else {
        /*
         * Add a new device token.
         */
        user.expoPushTokens.push({
          token,
          deviceId: deviceId || null,
          platform: platform || null,
          enabled: true,
          lastRegisteredAt: new Date(),
        });
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message:
          "Expo Push Token registered successfully.",
      });
    } catch (error) {
      console.error(
        "[Push Token] Registration failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to register Expo Push Token.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Disable Expo Push Token
|--------------------------------------------------------------------------
|
| POST /api/notifications/push-token/disable
|
*/
router.post(
  "/push-token/disable",
  requireAuth,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user ID not found.",
        });
      }

      const { token } = req.body;

      if (!token || typeof token !== "string") {
        return res.status(400).json({
          success: false,
          message:
            "Expo Push Token is required.",
        });
      }

      const result = await User.updateOne(
        {
          _id: userId,
          "expoPushTokens.token": token,
        },
        {
          $set: {
            "expoPushTokens.$.enabled": false,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message:
          result.modifiedCount > 0
            ? "Expo Push Token disabled successfully."
            : "Expo Push Token was not found.",
      });
    } catch (error) {
      console.error(
        "[Push Token] Disable failed:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to disable Expo Push Token.",
      });
    }
  }
);

module.exports = router;