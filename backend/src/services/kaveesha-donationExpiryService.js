const Donation = require("../models/kaveesha-Donation");
const ExpiryAlert = require("../models/kaveesha-ExpiryAlert");
const {
  sendPushToDonor,
} = require("./kaveesha-expoPushNotificationService");

/*
|--------------------------------------------------------------------------
| Donation Expiry Service
|--------------------------------------------------------------------------
|
| The donation rescue window is controlled by availabilityEnd.
|
| We use availabilityEnd for:
|
|   6 hours remaining  -> warning
|   2 hours remaining  -> urgent warning
|   30 minutes remaining -> critical warning
|   0 remaining        -> donation expired
|
| expiryTime is NOT used by this service.
|
|--------------------------------------------------------------------------
*/

const EXEMPT_STATUSES = [
  "completed",
  "cancelled",
  "expired",
];

/*
|--------------------------------------------------------------------------
| Expiry Alert Rules
|--------------------------------------------------------------------------
*/

const ALERT_RULES = [
  {
    type: "EXPIRING_6_HOURS",
    thresholdMinutes: 6 * 60,
    title: "Rescue Window Ending Soon",
    message: (donation) =>
      `Your ${donation.foodType} donation has about 6 hours left for rescue. Please make sure it is collected before the rescue window closes.`,
  },

  {
    type: "EXPIRING_2_HOURS",
    thresholdMinutes: 2 * 60,
    title: "Rescue Window Closing",
    message: (donation) =>
      `Your ${donation.foodType} donation has about 2 hours left for rescue. Please arrange collection soon.`,
  },

  {
    type: "EXPIRING_30_MINUTES",
    thresholdMinutes: 30,
    title: "Rescue Window Closing Soon",
    message: (donation) =>
      `Your ${donation.foodType} donation has only 30 minutes left for rescue. Please arrange collection immediately.`,
  },
];

/*
|--------------------------------------------------------------------------
| Generate Expiry Alerts
|--------------------------------------------------------------------------
|
| Checks active donations and creates alerts when their rescue window
| reaches one of the configured thresholds.
|--------------------------------------------------------------------------
*/

async function generateExpiryAlerts() {
  try {
    const now = new Date();

    const donations = await Donation.find({
  status: {
    $in: ["pending", "active"],
  },
  availabilityEnd: {
    $gt: now,
  },
    }).select(
      "_id donor foodType availabilityEnd status donationCode"
    );

    let createdCount = 0;

    for (const donation of donations) {
      if (!donation.availabilityEnd) {
        continue;
      }

      const expiryTime = new Date(
        donation.availabilityEnd
      ).getTime();

      if (Number.isNaN(expiryTime)) {
        continue;
      }

      const remainingMinutes =
        (expiryTime - now.getTime()) / (1000 * 60);

      for (const rule of ALERT_RULES) {
        /*
         * We trigger when the donation is at or below
         * the threshold.
         *
         * Example:
         *
         * 6 hours = 360 minutes
         *
         * Alert when remaining time <= 360.
         */
        if (remainingMinutes <= rule.thresholdMinutes) {
          try {
           const alert =
  await ExpiryAlert.create({
    donation: donation._id,
    donor: donation.donor,
    type: rule.type,
    title: rule.title,
    message: rule.message(donation),
    read: false,
    pushNotificationSent: false,
    triggeredAt: now,
  });

createdCount++;

console.log(
  `[Expiry Alert] Created ${rule.type} for donation ${donation._id}`
);

/*
|--------------------------------------------------------------------------
| Send Expo Push Notification
|--------------------------------------------------------------------------
*/

const pushResult =
  await sendPushToDonor({
    donorId: donation.donor,
    title: rule.title,
    body: rule.message(donation),
    data: {
      type: "EXPIRY_ALERT",
      alertId: String(alert._id),
      donationId: String(
        donation._id
      ),
    },
  });

if (pushResult.success) {
  await ExpiryAlert.updateOne(
    {
      _id: alert._id,
    },
    {
      $set: {
        pushNotificationSent: true,
      },
    }
  );

  console.log(
    `[Expiry Alert] Push notification sent for alert ${alert._id}`
  );
}

            console.log(
              `[Expiry Alert] Created ${rule.type} for donation ${donation._id}`
            );
          } catch (error) {
            /*
             * Duplicate alerts are expected when the cron job
             * runs again after an alert has already been created.
             *
             * MongoDB's unique index prevents duplicates.
             */
            if (error.code === 11000) {
              continue;
            }

            console.error(
              `[Expiry Alert] Failed to create ${rule.type} for donation ${donation._id}:`,
              error.message
            );
          }
        }
      }
    }

    return {
      success: true,
      createdCount,
    };
  } catch (error) {
    console.error(
      "[Expiry Alert] Failed to generate expiry alerts:",
      error.message
    );

    return {
      success: false,
      createdCount: 0,
      error: error.message,
    };
  }
}

/*
|--------------------------------------------------------------------------
| Expire Overdue Donations
|--------------------------------------------------------------------------
|
| A donation becomes expired when availabilityEnd has passed.
|--------------------------------------------------------------------------
*/

async function expireOverdueDonations() {
  try {
    const now = new Date();

    const result = await Donation.updateMany(
      {
        availabilityEnd: {
          $lt: now,
        },

        status: {
          $nin: EXEMPT_STATUSES,
        },
      },
      {
        $set: {
          status: "expired",
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[Donation Expiry] ${result.modifiedCount} donation(s) marked as expired.`
      );
    }

    return {
      success: true,
      modifiedCount: result.modifiedCount,
    };
  } catch (error) {
    console.error(
      "[Donation Expiry] Failed to expire overdue donations:",
      error.message
    );

    return {
      success: false,
      modifiedCount: 0,
      error: error.message,
    };
  }
}

/*
|--------------------------------------------------------------------------
| Check Whether One Donation Is Expired
|--------------------------------------------------------------------------
*/

function isDonationExpired(donation) {
  if (!donation) {
    return false;
  }

  if (EXEMPT_STATUSES.includes(donation.status)) {
    return false;
  }

  if (!donation.availabilityEnd) {
    return false;
  }

  const availabilityEnd = new Date(
    donation.availabilityEnd
  );

  if (Number.isNaN(availabilityEnd.getTime())) {
    return false;
  }

  return availabilityEnd.getTime() < Date.now();
}

/*
|--------------------------------------------------------------------------
| Mark One Donation As Expired
|--------------------------------------------------------------------------
*/

async function expireDonationIfNeeded(donation) {
  try {
    if (!donation) {
      return null;
    }

    if (!isDonationExpired(donation)) {
      return donation;
    }

    donation.status = "expired";

    await donation.save();

    return donation;
  } catch (error) {
    console.error(
      "[Donation Expiry] Failed to expire donation:",
      error.message
    );

    throw error;
  }
}

module.exports = {
  ALERT_RULES,
  generateExpiryAlerts,
  expireOverdueDonations,
  isDonationExpired,
  expireDonationIfNeeded,
};