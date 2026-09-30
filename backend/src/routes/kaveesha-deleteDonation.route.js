const express = require("express");
const mongoose = require("mongoose");

const Donation = require("../models/kaveesha-Donation");

const requireAuth =
  require("../middleware/kaveesha-authMiddleware").requireAuth;

const router = express.Router();

/*
|--------------------------------------------------------------------------
| DELETE /api/donor/donations/:id
|--------------------------------------------------------------------------
|
| Permanent deletion is allowed only for:
|
| - pending
| - cancelled
| - expired
|
| Active donations remain protected.
|
*/
router.delete(
  "/:id",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;

      /*
      |--------------------------------------------------------------------------
      | Validate ID
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
      | Find donor's donation
      |--------------------------------------------------------------------------
      */
      const donation =
        await Donation.findOne({
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
      | Allowed deletion statuses
      |--------------------------------------------------------------------------
      */
      const deletableStatuses = [
        "pending",
        "cancelled",
        "expired",
      ];

      if (
        !deletableStatuses.includes(
          donation.status
        )
      ) {
        let message =
          "This donation cannot be deleted.";

        if (donation.status === "active") {
          message =
            "Active donations cannot be deleted. You can cancel the donation instead.";
        }

        if (donation.status === "completed") {
          message =
            "Completed donations cannot be deleted because they are part of your donation history.";
        }

        return res.status(400).json({
          success: false,
          code: "DONATION_NOT_DELETABLE",
          message,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Delete
      |--------------------------------------------------------------------------
      */
      await Donation.deleteOne({
        _id: donation._id,
        donor: req.user.id,
      });

      return res.status(200).json({
        success: true,
        message:
          "Donation deleted successfully.",
        data: {
          id: donation._id,
        },
      });
    } catch (error) {
      console.error(
        "Delete donation error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete donation.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| PATCH /api/donor/donations/:id/cancel
|--------------------------------------------------------------------------
|
| Cancellation is allowed for:
|
| - pending
| - active
|
| An active donation remains ACTIVE even when it is
| within the 24-hour expiring-soon window.
|
*/
router.patch(
  "/:id/cancel",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;

      /*
      |--------------------------------------------------------------------------
      | Validate ID
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
      | Find donor's donation
      |--------------------------------------------------------------------------
      */
      const donation =
        await Donation.findOne({
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
      | Status protection
      |--------------------------------------------------------------------------
      */
      if (
        donation.status ===
        "completed"
      ) {
        return res.status(400).json({
          success: false,
          code: "DONATION_NOT_CANCELLABLE",
          message:
            "A completed donation cannot be cancelled.",
        });
      }

      if (
        donation.status ===
        "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          code: "ALREADY_CANCELLED",
          message:
            "This donation is already cancelled.",
        });
      }

      if (
        donation.status ===
        "expired"
      ) {
        return res.status(400).json({
          success: false,
          code: "DONATION_EXPIRED",
          message:
            "An expired donation cannot be cancelled.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Allowed statuses
      |--------------------------------------------------------------------------
      */
      const cancellableStatuses = [
        "pending",
        "active",
      ];

      if (
        !cancellableStatuses.includes(
          donation.status
        )
      ) {
        return res.status(400).json({
          success: false,
          code: "DONATION_NOT_CANCELLABLE",
          message:
            "This donation cannot be cancelled.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Cancel donation
      |--------------------------------------------------------------------------
      */
      donation.status =
        "cancelled";

      await donation.save();

      return res.status(200).json({
        success: true,
        message:
          "Donation cancelled successfully.",
        data: donation,
      });
    } catch (error) {
      console.error(
        "Cancel donation error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to cancel donation.",
      });
    }
  }
);

module.exports = router;