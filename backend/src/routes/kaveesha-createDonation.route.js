// backend/src/routes/kaveesha-createDonation.route.js
// Create donation endpoint.
// Owner: Kaveesha

const express = require('express');

const router = express.Router();

const Donation = require('../models/kaveesha-Donation');

const {
  validateDonationPayload,
} = require('../middleware/kaveesha-validateDonation');

const {
  requireAuth,
} = require('../middleware/kaveesha-authMiddleware');

const cloudinary = require("../config/dilshara-cloudinary");

function generateDonationCode() {
  const year =
    new Date().getFullYear();

  const random =
    Math.floor(
      100000 +
        Math.random() * 900000,
    );

  return `RM-${year}-${random}`;
}

async function uploadDonationPhoto(
  imageBase64,
  mimeType = 'image/jpeg',
) {
  if (!imageBase64) {
    return null;
  }

  const dataUri =
    `data:${mimeType};base64,${imageBase64}`;

  const result =
    await cloudinary.uploader.upload(
      dataUri,
      {
        folder:
          'resqmeal/donations',
        resource_type: 'image',
      },
    );

  return result.secure_url;
}

router.post(
  '/',
  requireAuth,
  validateDonationPayload,
  async (req, res) => {
    try {
      const {
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

        photoBase64,
        photoMimeType,

        photoUrl,

        pickupAddress,
        pickupDistrict,

        pickupWindowStart,
        pickupWindowEnd,

        donationType,

        aiResult,
        aiReason,

        safety,
      } = req.body;

      let finalPhotoUrl =
        photoUrl || null;

      /*
       * The frontend sends the selected image as Base64
       * because the same image is already used by the
       * Gemini visual screening step.
       *
       * We upload it to Cloudinary only when publishing.
       */
      if (
        photoBase64 &&
        String(photoBase64).trim()
      ) {
        try {
          finalPhotoUrl =
            await uploadDonationPhoto(
              photoBase64,
              photoMimeType ||
                'image/jpeg',
            );
        } catch (uploadError) {
          console.error(
            '[createDonation] Cloudinary upload failed:',
            uploadError,
          );

          return res.status(500).json({
            success: false,
            message:
              'The donation photo could not be uploaded. Please try again.',
          });
        }
      }

      /*
       * If the frontend does not explicitly provide
       * availability dates, use preparation and expiry.
       *
       * This keeps the existing Donation model compatible
       * with the current 5-step wizard.
       */
      const finalAvailabilityStart =
        availabilityStart ||
        preparationTime;

      const finalAvailabilityEnd =
        availabilityEnd ||
        expiryTime;

      const donation =
  await Donation.create({
    donor: req.user.id,

          donationType:
            donationType || 'NORMAL',

          foodType,

          foodCategory:
            foodCategory ||
            'Uncategorized',

          quantity,

          quantityUnit:
            quantityUnit || 'kg',

          numberOfPortions,

          preparationTime,

          expiryTime,

          availabilityStart:
            finalAvailabilityStart,

          availabilityEnd:
            finalAvailabilityEnd,

          storageCondition:
            storageCondition ||
            'Room Temperature',

          allergenInfo:
            allergenInfo || '',

          packagingCondition:
            packagingCondition || '',

          additionalDetails:
            additionalDetails || '',

          photoUrl:
            finalPhotoUrl,

          pickupAddress:
            pickupAddress || '',

          pickupDistrict:
            pickupDistrict || '',

          pickupWindowStart:
            pickupWindowStart || null,

          pickupWindowEnd:
            pickupWindowEnd || null,

          aiResult:
            aiResult || 'PENDING',

          aiReason:
            aiReason || '',

          safety:
            safety || {},

          status: 'pending',

          donationCode:
            generateDonationCode(),
        });

      return res.status(201).json({
        success: true,
        message:
          'Donation created successfully',
        data: donation,
      });
    } catch (err) {
      if (
        err.name ===
        'ValidationError'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Validation failed',
          errors: err.errors,
        });
      }

      console.error(
        '[createDonation] Failed to create donation:',
        err,
      );

      return res.status(500).json({
        success: false,
        message:
          'Something went wrong while creating the donation',
      });
    }
  },
);

module.exports = router;