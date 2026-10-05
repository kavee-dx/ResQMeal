const axios = require("axios");
const User = require("../models/dushani-User");

const EXPO_PUSH_URL =
  "https://exp.host/--/api/v2/push/send";

/**
 * Send a push notification to all enabled Expo Push Tokens
 * registered for a donor.
 */
async function sendPushToDonor({
  donorId,
  title,
  body,
  data = {},
}) {
  try {
    if (!donorId) {
      return {
        success: false,
        sentCount: 0,
        message: "Donor ID is missing.",
      };
    }

    const user = await User.findById(donorId).select(
      "expoPushTokens"
    );

    if (!user) {
      return {
        success: false,
        sentCount: 0,
        message: "Donor not found.",
      };
    }

    const tokens = (user.expoPushTokens || []).filter(
      (item) =>
        item &&
        item.token &&
        item.enabled !== false
    );

    if (tokens.length === 0) {
      console.log(
        `[Expo Push] No enabled push tokens for donor ${donorId}.`
      );

      return {
        success: false,
        sentCount: 0,
        message: "No enabled Expo Push Tokens found.",
      };
    }

    const messages = tokens.map((item) => ({
      to: item.token,
      sound: "default",
      title,
      body,
      data,
      channelId: "expiry-alerts",
      priority: "high",
    }));

    const response = await axios.post(
      EXPO_PUSH_URL,
      messages,
      {
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const results = response.data?.data || [];

    let sentCount = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const tokenRecord = tokens[i];

      if (result?.status === "ok") {
        sentCount++;
      }

      /*
       * If Expo tells us that a device token is no longer
       * registered, disable that token in our database.
       */
      if (
        result?.status === "error" &&
        result?.details?.error ===
          "DeviceNotRegistered"
      ) {
        await User.updateOne(
          {
            _id: donorId,
            "expoPushTokens.token":
              tokenRecord.token,
          },
          {
            $set: {
              "expoPushTokens.$.enabled": false,
            },
          }
        );

        console.log(
          `[Expo Push] Disabled invalid token for donor ${donorId}.`
        );
      }
    }

    console.log(
      `[Expo Push] Sent ${sentCount}/${messages.length} notification(s).`
    );

    return {
      success: sentCount > 0,
      sentCount,
      results,
    };
  } catch (error) {
    console.error(
      "[Expo Push] Failed to send notification:",
      error.response?.data ||
        error.message ||
        error
    );

    return {
      success: false,
      sentCount: 0,
      message:
        error.response?.data?.errors?.[0]?.message ||
        error.message ||
        "Failed to send push notification.",
    };
  }
}

module.exports = {
  sendPushToDonor,
};