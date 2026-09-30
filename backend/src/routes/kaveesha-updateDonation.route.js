const express = require("express");
const mongoose = require("mongoose");

const Donation = require("../models/kaveesha-Donation");

const requireAuth =
  require("../middleware/kaveesha-authMiddleware").requireAuth;

const {
  validateDonationUpdatePayload,
} = require("../middleware/kaveesha-validateDonationUpdate");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Editable fields for PENDING donations
|--------------------------------------------------------------------------
*/
const PENDING_EDITABLE_FIELDS = [
  "donationType",
  "foodType",
  "foodCategory",
  "quantity",
  "quantityUnit",
  "numberOfPortions",
  "preparationTime",
  "expiryTime",
  "availabilityStart",
  "availabilityEnd",
  "additionalDetails",
  "pickupAddress",
  "pickupDistrict",
  "pickupWindowStart",
  "pickupWindowEnd",
];

/*
|--------------------------------------------------------------------------
| Editable fields for ACTIVE donations
|--------------------------------------------------------------------------
|
| Active donations can only change operational information.
| Core food identity, preparation and expiry information are locked.
|
*/
const ACTIVE_EDITABLE_FIELDS = [
  "quantity",
  "quantityUnit",
  "numberOfPortions",
  "availabilityStart",
  "availabilityEnd",
  "additionalDetails",
  "pickupAddress",
  "pickupDistrict",
  "pickupWindowStart",
  "pickupWindowEnd",
];

/*
|--------------------------------------------------------------------------
| Permanently locked fields
|--------------------------------------------------------------------------
|
| These fields must never be changed through normal donation editing.
|
*/
const LOCKED_FIELDS = [
  "safety",
  "aiResult",
  "aiReason",
  "storageCondition",
  "allergenInfo",
  "packagingCondition",
  "photoUrl",
];

/*
|--------------------------------------------------------------------------
| Time constants
|--------------------------------------------------------------------------
*/
const ONE_HOUR_MS = 1000 * 60 * 60;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Get the proposed value after applying the request body.
 *
 * If the client supplied the field, use the supplied value.
 * Otherwise, use the existing donation value.
 */
function getProposedValue(body, donation, field) {
  if (
    Object.prototype.hasOwnProperty.call(
      body,
      field
    )
  ) {
    return body[field];
  }

  return donation[field];
}

/**
 * Convert a value into a Date.
 */
function toDate(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Calculate donation priority.
 *
 * HIGH:
 * - URGENT donation
 * - availability ends within 10 hours
 *
 * MEDIUM:
 * - availability ends within 24 hours
 *
 * LOW:
 * - availability ends after 24 hours
 */
function calculateDonationPriority({
  donationType,
  availabilityEnd,
}) {
  const end = new Date(availabilityEnd);

  if (Number.isNaN(end.getTime())) {
    return "medium";
  }

  if (donationType === "URGENT") {
    return "high";
  }

  const hoursRemaining =
    (end.getTime() - Date.now()) /
    ONE_HOUR_MS;

  if (hoursRemaining <= 10) {
    return "high";
  }

  if (hoursRemaining <= 24) {
    return "medium";
  }

  return "low";
}

/**
 * Get hours remaining until a date.
 */
function getHoursRemaining(value) {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  return (
    (date.getTime() - Date.now()) /
    ONE_HOUR_MS
  );
}

/*
|--------------------------------------------------------------------------
| PATCH /api/donor/donations/:id
|--------------------------------------------------------------------------
*/
router.patch(
  "/:id",
  requireAuth,
  validateDonationUpdatePayload,
  async (req, res) => {
    try {
      const { id } = req.params;

      /*
      |--------------------------------------------------------------------------
      | Validate donation ID
      |--------------------------------------------------------------------------
      */
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid donation ID.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Find donation belonging to logged-in donor
      |--------------------------------------------------------------------------
      */
      const donation = await Donation.findOne({
        _id: id,
        donor: req.user.id,
      });

      if (!donation) {
        return res.status(404).json({
          success: false,
          message: "Donation not found.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Permanently non-editable statuses
      |--------------------------------------------------------------------------
      */
      if (donation.status === "completed") {
        return res.status(400).json({
          success: false,
          code: "DONATION_NOT_EDITABLE",
          message:
            "Completed donations cannot be edited.",
        });
      }

      if (donation.status === "cancelled") {
        return res.status(400).json({
          success: false,
          code: "DONATION_NOT_EDITABLE",
          message:
            "Cancelled donations cannot be edited.",
        });
      }

      if (donation.status === "expired") {
        return res.status(400).json({
          success: false,
          code: "DONATION_NOT_EDITABLE",
          message:
            "Expired donations cannot be edited.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Safety / AI / photo protection
      |--------------------------------------------------------------------------
      */
      const attemptedLockedFields =
        LOCKED_FIELDS.filter((field) =>
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        );

      if (
        attemptedLockedFields.includes(
          "safety"
        )
      ) {
        return res.status(400).json({
          success: false,
          code: "SAFETY_LOCKED",
          message:
            "Safety assessment cannot be changed after the donation is posted. If the safety information is incorrect, cancel this donation and create a new one.",
        });
      }

      if (
        attemptedLockedFields.includes(
          "aiResult"
        ) ||
        attemptedLockedFields.includes(
          "aiReason"
        )
      ) {
        return res.status(400).json({
          success: false,
          code: "AI_LOCKED",
          message:
            "AI screening information cannot be changed through donation editing.",
        });
      }

      if (
        attemptedLockedFields.includes(
          "storageCondition"
        ) ||
        attemptedLockedFields.includes(
          "allergenInfo"
        ) ||
        attemptedLockedFields.includes(
          "packagingCondition"
        )
      ) {
        return res.status(400).json({
          success: false,
          code: "SAFETY_INFORMATION_LOCKED",
          message:
            "Food safety information cannot be changed after the donation is posted. If this information needs to change, cancel this donation and create a new one.",
        });
      }

      if (
        attemptedLockedFields.includes(
          "photoUrl"
        )
      ) {
        return res.status(400).json({
          success: false,
          code: "PHOTO_LOCKED",
          message:
            "The donation photo cannot be changed through this edit operation.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Determine allowed fields
      |--------------------------------------------------------------------------
      */
      let editableFields;

      if (donation.status === "pending") {
        editableFields =
          PENDING_EDITABLE_FIELDS;
      } else if (donation.status === "active") {
        editableFields =
          ACTIVE_EDITABLE_FIELDS;
      } else {
        return res.status(400).json({
          success: false,
          code: "DONATION_NOT_EDITABLE",
          message:
            "This donation cannot be edited in its current status.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Reject fields that are not allowed for this status
      |--------------------------------------------------------------------------
      */
      const suppliedFields =
        Object.keys(req.body);

      const forbiddenForCurrentStatus =
        suppliedFields.filter(
          (field) =>
            !editableFields.includes(field) &&
            !LOCKED_FIELDS.includes(field)
        );

      if (
        forbiddenForCurrentStatus.length > 0
      ) {
        if (donation.status === "active") {
          return res.status(400).json({
            success: false,
            code: "ACTIVE_DONATION_RESTRICTED",
            message:
              "For active donations, only quantity, quantity unit, portions, pickup details, availability, and additional details can be changed.",
            fields:
              forbiddenForCurrentStatus,
          });
        }

        return res.status(400).json({
          success: false,
          code: "FIELD_NOT_EDITABLE",
          message:
            "One or more supplied fields cannot be edited.",
          fields:
            forbiddenForCurrentStatus,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Determine fields actually being changed
      |--------------------------------------------------------------------------
      */
      const fieldsToUpdate =
        editableFields.filter((field) =>
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        );

      if (
        fieldsToUpdate.length === 0
      ) {
        return res.status(400).json({
          success: false,
          code: "NO_EDITABLE_FIELDS",
          message:
            "No editable donation fields were provided.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Active donation defensive lifecycle check
      |--------------------------------------------------------------------------
      |
      | If the donation was active when the screen opened but time has passed
      | while the donor was editing, prevent the edit.
      |
      | IMPORTANT:
      | Being within 24 hours does NOT change the status.
      | The donation remains ACTIVE.
      |--------------------------------------------------------------------------
      */
      if (donation.status === "active") {
        const currentEnd =
          donation.availabilityEnd ||
          donation.expiryTime;

        const currentHoursRemaining =
          getHoursRemaining(currentEnd);

        if (
          currentHoursRemaining !== null &&
          currentHoursRemaining <= 0
        ) {
          donation.status = "expired";

          await donation.save();

          return res.status(400).json({
            success: false,
            code: "DONATION_NOT_EDITABLE",
            message:
              "This donation has expired because its availability period has ended.",
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Build proposed final values
      |--------------------------------------------------------------------------
      |
      | We validate the complete donation AFTER applying the requested changes.
      |
      */
      const preparationTime =
        toDate(
          getProposedValue(
            req.body,
            donation,
            "preparationTime"
          )
        );

      const expiryTime =
        toDate(
          getProposedValue(
            req.body,
            donation,
            "expiryTime"
          )
        );

      const availabilityStart =
        toDate(
          getProposedValue(
            req.body,
            donation,
            "availabilityStart"
          )
        );

      const availabilityEnd =
        toDate(
          getProposedValue(
            req.body,
            donation,
            "availabilityEnd"
          )
        );

      /*
      |--------------------------------------------------------------------------
      | Validate preparation and expiry
      |--------------------------------------------------------------------------
      */
      if (
        !preparationTime ||
        !expiryTime
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Preparation and expiry times must be valid dates.",
        });
      }

      if (
        expiryTime <= preparationTime
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Expiry time must be after preparation time.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Food itself must not already be expired
      |--------------------------------------------------------------------------
      */
      if (
        expiryTime.getTime() <=
        Date.now()
      ) {
        return res.status(400).json({
          success: false,
          code: "FOOD_ALREADY_EXPIRED",
          message:
            "The food expiry time has already passed. This donation cannot be edited.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate availability
      |--------------------------------------------------------------------------
      */
      if (
        !availabilityStart ||
        !availabilityEnd
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Availability times must be valid dates.",
        });
      }

      if (
        availabilityEnd <=
        availabilityStart
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Availability end time must be after availability start time.",
        });
      }

      if (
        availabilityStart <
        preparationTime
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Availability cannot begin before preparation time.",
        });
      }

      if (
        availabilityEnd > expiryTime
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Availability cannot continue beyond the food expiry time.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | New availability must be in the future
      |--------------------------------------------------------------------------
      */
      const proposedHoursRemaining =
        getHoursRemaining(
          availabilityEnd
        );

      if (
        proposedHoursRemaining !== null &&
        proposedHoursRemaining <= 0
      ) {
        return res.status(400).json({
          success: false,
          code: "AVAILABILITY_ALREADY_ENDED",
          message:
            "The new availability period has already ended. Please provide a future availability end time.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT:
      | No active -> expiring transition.
      |--------------------------------------------------------------------------
      |
      | If the proposed availability ends within 24 hours, the donation
      | remains ACTIVE. The frontend will display "EXPIRING SOON".
      |--------------------------------------------------------------------------
      */

      /*
      |--------------------------------------------------------------------------
      | Validate pickup window
      |--------------------------------------------------------------------------
      */
      const pickupWindowStartValue =
        getProposedValue(
          req.body,
          donation,
          "pickupWindowStart"
        );

      const pickupWindowEndValue =
        getProposedValue(
          req.body,
          donation,
          "pickupWindowEnd"
        );

      const pickupWindowStart =
        toDate(
          pickupWindowStartValue
        );

      const pickupWindowEnd =
        toDate(
          pickupWindowEndValue
        );

      const hasPickupWindow =
        pickupWindowStartValue !==
          null &&
        pickupWindowStartValue !==
          undefined &&
        pickupWindowStartValue !==
          "" ||
        pickupWindowEndValue !==
          null &&
        pickupWindowEndValue !==
          undefined &&
        pickupWindowEndValue !==
          "";

      if (hasPickupWindow) {
        if (
          !pickupWindowStart ||
          !pickupWindowEnd
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Both pickup window start and pickup window end are required.",
          });
        }

        if (
          pickupWindowEnd <=
          pickupWindowStart
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Pickup window end time must be after pickup window start time.",
          });
        }

        if (
          pickupWindowStart <
          availabilityStart
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Pickup window cannot start before the donation becomes available.",
          });
        }

        if (
          pickupWindowEnd >
          availabilityEnd
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Pickup window cannot end after the donation availability period.",
          });
        }

        if (
          pickupWindowEnd >
          expiryTime
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Pickup window cannot continue beyond the food expiry time.",
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Build update data
      |--------------------------------------------------------------------------
      */
      const updateData = {};

      for (
        const field of fieldsToUpdate
      ) {
        updateData[field] =
          req.body[field];
      }

      /*
      |--------------------------------------------------------------------------
      | Normalize date fields
      |--------------------------------------------------------------------------
      */
      const dateFields = [
        "preparationTime",
        "expiryTime",
        "availabilityStart",
        "availabilityEnd",
        "pickupWindowStart",
        "pickupWindowEnd",
      ];

      for (
        const field of dateFields
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            updateData,
            field
          )
        ) {
          if (
            updateData[field] ===
              null ||
            updateData[field] ===
              undefined ||
            updateData[field] ===
              ""
          ) {
            updateData[field] =
              null;
          } else {
            const parsedDate =
              toDate(
                updateData[field]
              );

            if (!parsedDate) {
              return res.status(400).json({
                success: false,
                message:
                  `${field} must be a valid date.`,
              });
            }

            updateData[field] =
              parsedDate;
          }
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Normalize text fields
      |--------------------------------------------------------------------------
      */
      const textFields = [
        "foodType",
        "foodCategory",
        "additionalDetails",
        "pickupAddress",
        "pickupDistrict",
      ];

      for (
        const field of textFields
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            updateData,
            field
          )
        ) {
          if (
            typeof updateData[field] ===
            "string"
          ) {
            updateData[field] =
              updateData[field].trim();
          }
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Normalize numeric fields
      |--------------------------------------------------------------------------
      */
      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          "quantity"
        )
      ) {
        const quantity =
          Number(
            updateData.quantity
          );

        if (
          !Number.isFinite(
            quantity
          ) ||
          quantity <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Quantity must be a valid number greater than zero.",
          });
        }

        updateData.quantity =
          quantity;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          "numberOfPortions"
        )
      ) {
        const portions =
          Number(
            updateData.numberOfPortions
          );

        if (
          !Number.isFinite(
            portions
          ) ||
          portions <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Number of portions must be a valid number greater than zero.",
          });
        }

        updateData.numberOfPortions =
          portions;
      }

      /*
      |--------------------------------------------------------------------------
      | Basic required text validation
      |--------------------------------------------------------------------------
      */
      const finalFoodType =
        getProposedValue(
          req.body,
          donation,
          "foodType"
        );

      const finalFoodCategory =
        getProposedValue(
          req.body,
          donation,
          "foodCategory"
        );

      const finalPickupAddress =
        getProposedValue(
          req.body,
          donation,
          "pickupAddress"
        );

      const finalPickupDistrict =
        getProposedValue(
          req.body,
          donation,
          "pickupDistrict"
        );

      if (
        typeof finalFoodType !==
          "string" ||
        !finalFoodType.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Food type is required.",
        });
      }

      if (
        typeof finalFoodCategory !==
          "string" ||
        !finalFoodCategory.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Food category is required.",
        });
      }

      if (
        typeof finalPickupAddress !==
          "string" ||
        !finalPickupAddress.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Pickup address is required.",
        });
      }

      if (
        typeof finalPickupDistrict !==
          "string" ||
        !finalPickupDistrict.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Pickup district is required.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Final quantity validation
      |--------------------------------------------------------------------------
      */
      const finalQuantity =
        Number(
          getProposedValue(
            req.body,
            donation,
            "quantity"
          )
        );

      const finalPortions =
        Number(
          getProposedValue(
            req.body,
            donation,
            "numberOfPortions"
          )
        );

      if (
        !Number.isFinite(
          finalQuantity
        ) ||
        finalQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be greater than zero.",
        });
      }

      if (
        !Number.isFinite(
          finalPortions
        ) ||
        finalPortions <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Number of portions must be greater than zero.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Apply validated update
      |--------------------------------------------------------------------------
      */
      for (
        const field of fieldsToUpdate
      ) {
        donation[field] =
          updateData[field];
      }

      /*
      |--------------------------------------------------------------------------
      | Recalculate priority
      |--------------------------------------------------------------------------
      |
      | Priority is always calculated by the backend.
      | The frontend cannot manually choose the stored priority.
      |
      */
      donation.priority =
        calculateDonationPriority({
          donationType:
            donation.donationType,
          availabilityEnd:
            donation.availabilityEnd,
        });

      /*
      |--------------------------------------------------------------------------
      | Save
      |--------------------------------------------------------------------------
      */
      await donation.save();

      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */
      return res.status(200).json({
        success: true,
        message:
          "Donation updated successfully.",
        data: donation,
      });
    } catch (error) {
      console.error(
        "Update donation error:",
        error
      );

      /*
      |--------------------------------------------------------------------------
      | Mongoose validation error
      |--------------------------------------------------------------------------
      */
      if (
        error.name ===
        "ValidationError"
      ) {
        const errors =
          Object.values(
            error.errors
          ).map(
            (item) => item.message
          );

        return res.status(400).json({
          success: false,
          message:
            errors.join(" "),
          errors,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Duplicate value
      |--------------------------------------------------------------------------
      */
      if (
        error.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A duplicate donation value was detected.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | General server error
      |--------------------------------------------------------------------------
      */
      return res.status(500).json({
        success: false,
        message:
          "Failed to update donation.",
      });
    }
  }
);

module.exports = router;