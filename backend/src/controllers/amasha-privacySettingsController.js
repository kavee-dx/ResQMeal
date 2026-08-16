const PrivacySettings = require("../models/PrivacySettings");

const DEFAULTS = {
  profileVisible: true,
  showLocation: true,
  showDonationHistory: false,
  showContactInfo: false,
};

const ALLOWED_FIELDS = Object.keys(DEFAULTS);

// GET /api/settings/privacy/me
async function getPrivacySettings(req, res) {
  try {
    const userId = req.user.id;

    let settings = await PrivacySettings.findOne({ userId });

    if (!settings) {
      settings = await PrivacySettings.create({ userId, ...DEFAULTS });
    }

    return res.status(200).json({
      success: true,
      data: {
        profileVisible: settings.profileVisible,
        showLocation: settings.showLocation,
        showDonationHistory: settings.showDonationHistory,
        showContactInfo: settings.showContactInfo,
      },
    });
  } catch (error) {
    console.error("getPrivacySettings error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load privacy settings.",
    });
  }
}

// PUT /api/settings/privacy/me
async function updatePrivacySettings(req, res) {
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
        message: "No valid privacy fields provided.",
      });
    }

    const settings = await PrivacySettings.findOneAndUpdate(
      { userId },
      { $set: update, $setOnInsert: { userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Privacy settings updated.",
      data: {
        profileVisible: settings.profileVisible,
        showLocation: settings.showLocation,
        showDonationHistory: settings.showDonationHistory,
        showContactInfo: settings.showContactInfo,
      },
    });
  } catch (error) {
    console.error("updatePrivacySettings error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not update privacy settings.",
    });
  }
}

module.exports = { getPrivacySettings, updatePrivacySettings };