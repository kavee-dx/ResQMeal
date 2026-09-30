const express = require("express");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;

const Donation = require("../models/kaveesha-Donation");
const requireAuth = require("../middleware/kaveesha-authMiddleware").requireAuth;
const {
  validateDonationPayload,
} = require("../middleware/kaveesha-validateDonation");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Cloudinary configuration
|--------------------------------------------------------------------------
*/
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/*
|--------------------------------------------------------------------------
| Calculate donation priority
|--------------------------------------------------------------------------
|
| Priority is calculated by the system.
|
| HIGH:
| - Donation type is URGENT
| - OR availability ends within 10 hours
|
| MEDIUM:
| - Availability ends within 24 hours
|
| LOW:
| - Availability ends after 24 hours
|
| Donor does NOT manually select priority.
|--------------------------------------------------------------------------
*/
function calculateDonationPriority({
  donationType,
  availabilityEnd,
}) {
  const end = new Date(availabilityEnd);

  if (Number.isNaN(end.getTime())) {
    return "medium";
  }

  /*
   * URGENT donations are always high priority.
   */
  if (donationType === "URGENT") {
    return "high";
  }

  const hoursRemaining =
    (end.getTime() - Date.now()) /
    (1000 * 60 * 60);

  if (hoursRemaining <= 10) {
    return "high";
  }

  if (hoursRemaining <= 24) {
    return "medium";
  }

  return "low";
}

/*
|--------------------------------------------------------------------------
| Generate donation code
|--------------------------------------------------------------------------
|
| Example:
| RM-2026-483921
|--------------------------------------------------------------------------
*/
async function generateDonationCode() {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const randomNumber = Math.floor(
      100000 + Math.random() * 900000
    );

    const code = `RM-${year}-${randomNumber}`;

    const existingDonation = await Donation.findOne({
      donationCode: code,
    }).select("_id");

    if (!existingDonation) {
      return code;
    }
  }

  throw new Error("DONATION_CODE_GENERATION_FAILED");
}

/*
|--------------------------------------------------------------------------
| Upload base64 image to Cloudinary
|--------------------------------------------------------------------------
*/
async function uploadDonationPhoto(
  imageBase64,
  mimeType
) {
  if (!imageBase64) {
    return null;
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error("CLOUDINARY_CONFIG_MISSING");
  }

  const safeMimeType =
    typeof mimeType === "string" &&
    mimeType.startsWith("image/")
      ? mimeType
      : "image/jpeg";

  const dataUri = `data:${safeMimeType};base64,${imageBase64}`;

  const result = await cloudinary.uploader.upload(
    dataUri,
    {
      folder: "resqmeal/donations",
      resource_type: "image",
    }
  );

  return result.secure_url;
}

/*
|--------------------------------------------------------------------------
| POST /api/donor/donations
|--------------------------------------------------------------------------
*/
router.post(
  "/",
  requireAuth,
  validateDonationPayload,
  async (req, res) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Validate authenticated user
      |--------------------------------------------------------------------------
      */
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Authentication is required.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
        return res.status(401).json({
          success: false,
          message: "Invalid authenticated user.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Extract request data
      |--------------------------------------------------------------------------
      */
      const {
        donationType,
        foodType,
        foodCategory,
        quantity,
        quantityUnit,
        numberOfPortions,

        preparationTime,
        expiryTime,

        availabilityStart,
        availabilityEnd,

        storageCondition,
        allergenInfo,
        packagingCondition,

        additionalDetails,

        pickupAddress,
        pickupDistrict,
        pickupWindowStart,
        pickupWindowEnd,

        aiResult,
        aiReason,

        safety,

        photoBase64,
        photoMimeType,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | Extra server-side safety protection
      |--------------------------------------------------------------------------
      |
      | Safety information is mandatory.
      |--------------------------------------------------------------------------
      */
      if (!safety || typeof safety !== "object") {
        return res.status(400).json({
          success: false,
          message:
            "Safety assessment is required before a donation can be posted.",
        });
      }

      const requiredSafetyFields = [
        "storage",
        "temperature",
        "handling",
        "packaging",
        "allergens",
      ];

      const missingSafetyFields =
        requiredSafetyFields.filter(
          (field) =>
            !Object.prototype.hasOwnProperty.call(
              safety,
              field
            ) ||
            safety[field] === null ||
            safety[field] === undefined ||
            safety[field] === ""
        );

      if (missingSafetyFields.length > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Please complete all safety questions before posting the donation.",
          missingSafetyFields,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Blocking safety answers
      |--------------------------------------------------------------------------
      |
      | These answers indicate a direct safety concern.
      |
      | The donation cannot be posted.
      |--------------------------------------------------------------------------
      */
      const hasBlockingSafetyConcern =
        safety.storage === "NO" ||
        safety.handling === "NO" ||
        safety.packaging === "NO";

      if (hasBlockingSafetyConcern) {
        return res.status(400).json({
          success: false,
          code: "SAFETY_CONCERN",
          message:
            "This donation cannot be posted because a food safety concern was reported.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate NOT_SURE values
      |--------------------------------------------------------------------------
      */
      const allowedTemperatureAnswers = [
        "YES",
        "NO",
        "NOT_SURE",
      ];

      const allowedAllergenAnswers = [
        "YES",
        "NO",
        "NOT_SURE",
      ];

      if (
        !allowedTemperatureAnswers.includes(
          safety.temperature
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid temperature safety answer.",
        });
      }

      if (
        !allowedAllergenAnswers.includes(
          safety.allergens
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid allergen safety answer.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate date values again before database creation
      |--------------------------------------------------------------------------
      */
      const preparationDate = new Date(
        preparationTime
      );

      const expiryDate = new Date(
        expiryTime
      );

      const finalAvailabilityStart =
        new Date(availabilityStart);

      const finalAvailabilityEnd =
        new Date(availabilityEnd);

      const finalPickupWindowStart =
        new Date(pickupWindowStart);

      const finalPickupWindowEnd =
        new Date(pickupWindowEnd);

      if (
        Number.isNaN(
          preparationDate.getTime()
        ) ||
        Number.isNaN(
          expiryDate.getTime()
        ) ||
        Number.isNaN(
          finalAvailabilityStart.getTime()
        ) ||
        Number.isNaN(
          finalAvailabilityEnd.getTime()
        ) ||
        Number.isNaN(
          finalPickupWindowStart.getTime()
        ) ||
        Number.isNaN(
          finalPickupWindowEnd.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "One or more donation dates are invalid.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Preparation → Expiry
      |--------------------------------------------------------------------------
      */
      if (expiryDate <= preparationDate) {
        return res.status(400).json({
          success: false,
          message:
            "Expiry time must be after preparation time.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Availability
      |--------------------------------------------------------------------------
      */
      if (
        finalAvailabilityEnd <=
        finalAvailabilityStart
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Availability end time must be after availability start time.",
        });
      }

      if (
        finalAvailabilityStart <
        preparationDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Availability cannot begin before preparation time.",
        });
      }

      if (
        finalAvailabilityEnd >
        expiryDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Availability cannot continue beyond the food expiry time.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Pickup window
      |--------------------------------------------------------------------------
      */
      if (
        finalPickupWindowEnd <=
        finalPickupWindowStart
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Pickup window end time must be after pickup window start time.",
        });
      }

      if (
        finalPickupWindowStart <
        finalAvailabilityStart
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Pickup window cannot start before the donation becomes available.",
        });
      }

      if (
        finalPickupWindowEnd >
        finalAvailabilityEnd
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Pickup window cannot end after the donation availability period.",
        });
      }

      if (
        finalPickupWindowEnd >
        expiryDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Pickup window cannot continue beyond the food expiry time.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Upload photo
      |--------------------------------------------------------------------------
      */
      let photoUrl = null;

      if (photoBase64) {
        try {
          photoUrl = await uploadDonationPhoto(
            photoBase64,
            photoMimeType
          );
        } catch (photoError) {
          console.error(
            "Donation photo upload failed:",
            photoError?.message || photoError
          );

          if (
            photoError.message ===
            "CLOUDINARY_CONFIG_MISSING"
          ) {
            return res.status(500).json({
              success: false,
              message:
                "Photo upload is not configured correctly on the server.",
            });
          }

          return res.status(502).json({
            success: false,
            message:
              "The donation photo could not be uploaded. Please try again.",
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Generate unique donation code
      |--------------------------------------------------------------------------
      */
      let donationCode;

      try {
        donationCode =
          await generateDonationCode();
      } catch (codeError) {
        console.error(
          "Donation code generation failed:",
          codeError.message
        );

        return res.status(500).json({
          success: false,
          message:
            "Could not generate a donation code. Please try again.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Normalize optional text values
      |--------------------------------------------------------------------------
      */
      const cleanFoodType =
        typeof foodType === "string"
          ? foodType.trim()
          : foodType;

      const cleanFoodCategory =
        typeof foodCategory === "string"
          ? foodCategory.trim()
          : foodCategory;

      const cleanPickupAddress =
        typeof pickupAddress === "string"
          ? pickupAddress.trim()
          : pickupAddress;

      const cleanPickupDistrict =
        typeof pickupDistrict === "string"
          ? pickupDistrict.trim()
          : pickupDistrict;

      const cleanAdditionalDetails =
        typeof additionalDetails === "string"
          ? additionalDetails.trim()
          : additionalDetails;

      const cleanAllergenInfo =
        typeof allergenInfo === "string"
          ? allergenInfo.trim()
          : allergenInfo;

      const cleanPackagingCondition =
        typeof packagingCondition === "string"
          ? packagingCondition.trim()
          : packagingCondition;

      const cleanAiReason =
        typeof aiReason === "string"
          ? aiReason.trim()
          : aiReason;

      /*
      |--------------------------------------------------------------------------
      | Calculate priority
      |--------------------------------------------------------------------------
      |
      | This is system-generated.
      |--------------------------------------------------------------------------
      */
      const priority =
        calculateDonationPriority({
          donationType,
          availabilityEnd:
            finalAvailabilityEnd,
        });

      /*
      |--------------------------------------------------------------------------
      | Create donation
      |--------------------------------------------------------------------------
      */
      const donation =
        await Donation.create({
          donor: req.user.id,

          donationCode,

          donationType,

          foodType: cleanFoodType,
          foodCategory: cleanFoodCategory,

          quantity: Number(quantity),
          quantityUnit,

          numberOfPortions:
            Number(numberOfPortions),

          preparationTime:
            preparationDate,

          expiryTime:
            expiryDate,

          availabilityStart:
            finalAvailabilityStart,

          availabilityEnd:
            finalAvailabilityEnd,

          storageCondition,

          allergenInfo:
            cleanAllergenInfo,

          packagingCondition:
            cleanPackagingCondition,

          additionalDetails:
            cleanAdditionalDetails,

          photoUrl,

          pickupAddress:
            cleanPickupAddress,

          pickupDistrict:
            cleanPickupDistrict,

          pickupWindowStart:
            finalPickupWindowStart,

          pickupWindowEnd:
            finalPickupWindowEnd,

          /*
          |--------------------------------------------------------------------------
          | AI is decision support only
          |--------------------------------------------------------------------------
          */
          aiResult:
            aiResult || "PENDING",

          aiReason:
            cleanAiReason || "",

          /*
          |--------------------------------------------------------------------------
          | Store completed safety assessment
          |--------------------------------------------------------------------------
          */
          safety: {
            storage: safety.storage,
            temperature: safety.temperature,
            handling: safety.handling,
            packaging: safety.packaging,
            allergens: safety.allergens,
          },

          /*
          |--------------------------------------------------------------------------
          | System-generated priority
          |--------------------------------------------------------------------------
          */
          priority,

          /*
          |--------------------------------------------------------------------------
          | New donations start as pending
          |--------------------------------------------------------------------------
          */
          status: "pending",
        });

      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */
      return res.status(201).json({
        success: true,
        message: "Donation posted successfully.",
        data: donation,
      });
    } catch (error) {
      console.error(
        "Create donation error:",
        error
      );

      /*
      |--------------------------------------------------------------------------
      | Mongoose validation errors
      |--------------------------------------------------------------------------
      */
      if (
        error.name === "ValidationError"
      ) {
        const errors =
          Object.values(
            error.errors
          ).map(
            (item) => item.message
          );

        return res.status(400).json({
          success: false,
          message: errors.join(" "),
          errors,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Duplicate donation code
      |--------------------------------------------------------------------------
      */
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "A duplicate donation code was generated. Please try posting again.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to create donation.",
      });
    }
  }
);

module.exports = router;