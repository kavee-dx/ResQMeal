// Controller for volunteer availability (GET/PATCH).
// Owner: Dilshara

const VolunteerAvailability = require("../models/dilshara-VolunteerAvailability");
const { validateAvailabilityPayload } = require("../validators/dilshara-volunteerAvailability.validation");

exports.getAvailability = async (req, res) => {
  try {
    if (req.user.role !== "VOLUNTEER") {
      return res.status(403).json({
        success: false,
        message: "Only delivery volunteers have availability.",
      });
    }

    const userId = req.user.id;

    const availability = await VolunteerAvailability.findOne({ userId }).select(
      "availabilityStatus availableDays availableFrom availableTo"
    );

    if (!availability) {
      return res.status(200).json({
        success: true,
        availabilityStatus: "UNAVAILABLE",
        availableDays: [],
        availableFrom: "16:00",
        availableTo: "22:00",
      });
    }

    return res.status(200).json({
      success: true,
      availabilityStatus: availability.availabilityStatus,
      availableDays: availability.availableDays,
      availableFrom: availability.availableFrom,
      availableTo: availability.availableTo,
    });
  } catch (err) {
    console.error("getAvailability error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not load availability.",
    });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    if (req.user.role !== "VOLUNTEER") {
      return res.status(403).json({
        success: false,
        message: "Only delivery volunteers can update availability.",
      });
    }

    const userId = req.user.id;
    const { availabilityStatus, availableDays, availableFrom, availableTo } = req.body;

    const validationError = validateAvailabilityPayload(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const availability = await VolunteerAvailability.findOneAndUpdate(
      { userId },
      {
        $set: { availabilityStatus, availableDays, availableFrom, availableTo },
        $setOnInsert: { userId },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Availability updated.",
      availability: {
        availabilityStatus: availability.availabilityStatus,
        availableDays: availability.availableDays,
        availableFrom: availability.availableFrom,
        availableTo: availability.availableTo,
      },
    });
  } catch (err) {
    console.error("updateAvailability error:", err);
    return res.status(500).json({
      success: false,
      message: "Could not update availability.",
    });
  }
};