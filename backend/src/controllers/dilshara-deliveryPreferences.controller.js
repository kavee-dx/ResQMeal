// Controller for volunteer delivery preferences (GET/PATCH).
// Owner: Dilshara

const preferencesService = require("../services/dilshara-deliveryPreferences.service");
const { validateDeliveryPreferencesPayload } = require("../validators/dilshara-deliveryPreferences.validation");

exports.getDeliveryPreferences = async (req, res) => {
  try {
    if (req.user.role !== "VOLUNTEER") {
      return res.status(403).json({
        success: false,
        message: "Only delivery volunteers have delivery preferences.",
      });
    }

    const preferences = await preferencesService.getDeliveryPreferences(req.user.id);

    return res.status(200).json({ success: true, ...preferences });
  } catch (err) {
    console.error("getDeliveryPreferences error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not load delivery preferences.",
    });
  }
};

exports.updateDeliveryPreferences = async (req, res) => {
  try {
    if (req.user.role !== "VOLUNTEER") {
      return res.status(403).json({
        success: false,
        message: "Only delivery volunteers can update delivery preferences.",
      });
    }

    const validationError = validateDeliveryPreferencesPayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const preferences = await preferencesService.updateDeliveryPreferences(req.user.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Delivery preferences updated.",
      preferences,
    });
  } catch (err) {
    if (err.message === "PROFILE_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Volunteer profile not found.",
      });
    }

    console.error("updateDeliveryPreferences error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not update delivery preferences.",
    });
  }
};