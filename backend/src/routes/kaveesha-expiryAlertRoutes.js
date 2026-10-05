// backend/src/routes/kaveesha-expiryAlertRoutes.js

const express = require("express");

const ExpiryAlert = require("../models/kaveesha-ExpiryAlert");
const { requireAuth } = require("../middleware/kaveesha-authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Get current donor ID
|--------------------------------------------------------------------------
|
| Different versions of the auth middleware may store the user ID under
| slightly different properties. This keeps the route compatible.
|--------------------------------------------------------------------------
*/

function getUserId(req) {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    req.user?.user_id
  );
}

/*
|--------------------------------------------------------------------------
| GET /api/donor/expiry-alerts
|--------------------------------------------------------------------------
|
| Returns expiry alerts belonging only to the logged-in donor.
|
| Optional:
|   ?unread=true
|   ?limit=20
|--------------------------------------------------------------------------
*/

router.get("/", requireAuth, async (req, res) => {
  try {
    const donorId = getUserId(req);

    if (!donorId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated donor could not be identified.",
      });
    }

    const unreadOnly = req.query.unread === "true";

    let limit = Number.parseInt(req.query.limit, 10);

    if (Number.isNaN(limit) || limit <= 0) {
      limit = 20;
    }

    // Prevent very large requests.
    limit = Math.min(limit, 100);

    const filter = {
      donor: donorId,
    };

    if (unreadOnly) {
      filter.read = false;
    }

    const alerts = await ExpiryAlert.find(filter)
      .populate(
        "donation",
        "foodType foodCategory availabilityStart availabilityEnd status donationCode"
      )
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    /*
     * IMPORTANT:
     * The frontend API service expects the alerts inside `data`.
     */
    return res.status(200).json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error(
      "[Expiry Alerts] Failed to get alerts:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load expiry alerts.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/donor/expiry-alerts/unread-count
|--------------------------------------------------------------------------
|
| Returns the number of unread expiry alerts for the logged-in donor.
|--------------------------------------------------------------------------
*/

router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const donorId = getUserId(req);

    if (!donorId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated donor could not be identified.",
      });
    }

    const count = await ExpiryAlert.countDocuments({
      donor: donorId,
      read: false,
    });

    /*
     * IMPORTANT:
     * The frontend API service expects:
     * data: { count }
     */
    return res.status(200).json({
      success: true,
      data: {
        count,
      },
    });
  } catch (error) {
    console.error(
      "[Expiry Alerts] Failed to get unread count:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load unread notification count.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| PATCH /api/donor/expiry-alerts/:id/read
|--------------------------------------------------------------------------
|
| Marks one expiry alert as read.
|
| The donor condition ensures one donor cannot modify another donor's
| notification.
|--------------------------------------------------------------------------
*/

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const donorId = getUserId(req);

    if (!donorId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated donor could not be identified.",
      });
    }

    const alert = await ExpiryAlert.findOneAndUpdate(
      {
        _id: req.params.id,
        donor: donorId,
      },
      {
        $set: {
          read: true,
        },
      },
      {
        new: true,
      }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Expiry alert not found.",
      });
    }

    /*
     * IMPORTANT:
     * The frontend API service expects the alert inside `data`.
     */
    return res.status(200).json({
      success: true,
      message: "Expiry alert marked as read.",
      data: alert,
    });
  } catch (error) {
    console.error(
      "[Expiry Alerts] Failed to mark alert as read:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to mark expiry alert as read.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| PATCH /api/donor/expiry-alerts/read-all
|--------------------------------------------------------------------------
|
| Marks all unread expiry alerts belonging to the logged-in donor as read.
|--------------------------------------------------------------------------
*/

router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    const donorId = getUserId(req);

    if (!donorId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated donor could not be identified.",
      });
    }

    const result = await ExpiryAlert.updateMany(
      {
        donor: donorId,
        read: false,
      },
      {
        $set: {
          read: true,
        },
      }
    );

    /*
     * IMPORTANT:
     * The frontend API service expects modifiedCount inside `data`.
     */
    return res.status(200).json({
      success: true,
      message: "All expiry alerts marked as read.",
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error(
      "[Expiry Alerts] Failed to mark all alerts as read:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to mark all expiry alerts as read.",
    });
  }
});

module.exports = router;