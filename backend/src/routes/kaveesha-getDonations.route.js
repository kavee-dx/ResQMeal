const express = require("express");
const mongoose = require("mongoose");

const Donation = require("../models/kaveesha-Donation");

const requireAuth =
  require("../middleware/kaveesha-authMiddleware").requireAuth;

const router = express.Router();

const VALID_STATUSES = [
  "pending",
  "active",
  "completed",
  "cancelled",
  "expired",
];

/*
|--------------------------------------------------------------------------
| Helper: update expired donations
|--------------------------------------------------------------------------
|
| Makes sure a donation is marked expired when its availability period
| has already ended.
|
| Pending donations can also become expired once availabilityEnd has passed.
|
| IMPORTANT:
| Expiring soon is NOT a database status.
| A pending donation remains pending.
| An active donation remains active.
|--------------------------------------------------------------------------
*/
async function expireOverdueDonations(donorId) {
  const now = new Date();

  await Donation.updateMany(
    {
      donor: donorId,

      availabilityEnd: {
        $lt: now,
      },

      status: {
        $nin: [
          "completed",
          "cancelled",
          "expired",
        ],
      },
    },
    {
      $set: {
        status: "expired",
      },
    }
  );
}

/*
|--------------------------------------------------------------------------
| GET /api/donor/donations
|--------------------------------------------------------------------------
|
| Get all donations belonging to the logged-in donor.
|
| Optional:
|
| ?status=all
| ?status=pending
| ?status=active
| ?status=completed
| ?status=cancelled
| ?status=expired
|
| There is NO "expiring" status.
|
| "Expiring Soon" is calculated by the frontend using
| availabilityEnd and displayed as a UI warning.
|--------------------------------------------------------------------------
*/
router.get(
  "/",
  requireAuth,
  async (req, res) => {
    try {
      const donorId =
        req.user.id;

      const requestedStatus =
        typeof req.query.status ===
        "string"
          ? req.query.status
          : undefined;

      /*
      |--------------------------------------------------------------------------
      | Validate authenticated user
      |--------------------------------------------------------------------------
      */
      if (
        !donorId ||
        !mongoose.Types.ObjectId.isValid(
          donorId
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid authenticated user.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate optional status filter
      |--------------------------------------------------------------------------
      */
      if (
        requestedStatus &&
        requestedStatus !== "all" &&
        !VALID_STATUSES.includes(
          requestedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid donation status. Allowed values: all, ${VALID_STATUSES.join(
              ", "
            )}.`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Update expired donations
      |--------------------------------------------------------------------------
      |
      | Only genuinely expired donations change status.
      |
      | A donation within 24 hours of its availability end does NOT change
      | from pending/active.
      |--------------------------------------------------------------------------
      */
      await expireOverdueDonations(
        donorId
      );

      /*
      |--------------------------------------------------------------------------
      | Build query
      |--------------------------------------------------------------------------
      */
      const query = {
        donor: donorId,
      };

      /*
      |--------------------------------------------------------------------------
      | Apply status filter only when it is NOT "all"
      |--------------------------------------------------------------------------
      */
      if (
        requestedStatus &&
        requestedStatus !== "all"
      ) {
        query.status =
          requestedStatus;
      }

      /*
      |--------------------------------------------------------------------------
      | Fetch donations
      |--------------------------------------------------------------------------
      */
      const donations =
        await Donation.find(query)
          .sort({
            createdAt: -1,
          })
          .lean();

      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */
      return res.status(200).json({
        success: true,
        count: donations.length,
        data: donations,
      });
    } catch (error) {
      console.error(
        "Get my donations error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch your donations.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| GET /api/donor/donations/:id
|--------------------------------------------------------------------------
|
| Get one donation belonging to the logged-in donor.
|--------------------------------------------------------------------------
*/
router.get(
  "/:id",
  requireAuth,
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const donorId =
        req.user.id;

      /*
      |--------------------------------------------------------------------------
      | Validate authenticated user
      |--------------------------------------------------------------------------
      */
      if (
        !donorId ||
        !mongoose.Types.ObjectId.isValid(
          donorId
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid authenticated user.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate MongoDB ObjectId
      |--------------------------------------------------------------------------
      */
      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid donation ID.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Update expired donations
      |--------------------------------------------------------------------------
      |
      | No expiring status is created here.
      |--------------------------------------------------------------------------
      */
      await expireOverdueDonations(
        donorId
      );

      /*
      |--------------------------------------------------------------------------
      | Find donation owned by logged-in donor
      |--------------------------------------------------------------------------
      */
      const donation =
        await Donation.findOne({
          _id: id,
          donor: donorId,
        }).lean();

      if (!donation) {
        return res.status(404).json({
          success: false,
          message:
            "Donation not found.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Response
      |--------------------------------------------------------------------------
      */
      return res.status(200).json({
        success: true,
        data: donation,
      });
    } catch (error) {
      console.error(
        "Get donation by ID error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch the donation.",
      });
    }
  }
);

module.exports = router;