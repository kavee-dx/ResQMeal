const NotificationSettings = require("../models/NotificationSettings");

const DEFAULTS = {
  nearbyFoodAlerts: true,
  requestUpdates: true,
  deliveryUpdates: true,
  expiryReminders: true,
  emailNotifications: false,
};

const ALLOWED_FIELDS = Object.keys(DEFAULTS);

// GET /api/settings/notifications/me
async function getNotificationSettings(req, res) {
  try {
    const userId = req.user.id;

    let settings = await NotificationSettings.findOne({ userId });

    if (!settings) {
      settings = await NotificationSettings.create({ userId, ...DEFAULTS });
    }

    return res.status(200).json({
      success: true,
      data: {
        nearbyFoodAlerts: settings.nearbyFoodAlerts,
        requestUpdates: settings.requestUpdates,
        deliveryUpdates: settings.deliveryUpdates,
        expiryReminders: settings.expiryReminders,
        emailNotifications: settings.emailNotifications,
      },
    });
  } catch (error) {
    console.error("getNotificationSettings error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load notification settings.",
    });
  }
}

// PUT /api/settings/notifications/me
async function updateNotificationSettings(req, res) {
  try {
    const userId = req.user.id;
    const body = req.body || {};

    const update = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        if (typeof body[field] !== "boolean") {
          return res.status(400).json({
            success: false,
            message: `Field "${field}" must be true or false.`,
          });
        }
        update[field] = body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid notification fields provided.",
      });
    }

    const settings = await NotificationSettings.findOneAndUpdate(
      { userId },
      { $set: update, $setOnInsert: { userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Notification settings updated.",
      data: {
        nearbyFoodAlerts: settings.nearbyFoodAlerts,
        requestUpdates: settings.requestUpdates,
        deliveryUpdates: settings.deliveryUpdates,
        expiryReminders: settings.expiryReminders,
        emailNotifications: settings.emailNotifications,
      },
    });
  } catch (error) {
    console.error("updateNotificationSettings error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not update notification settings.",
    });
  }
}

module.exports = { getNotificationSettings, updateNotificationSettings };