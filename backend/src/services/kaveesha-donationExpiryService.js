const Donation = require("../models/kaveesha-Donation");

/*
|--------------------------------------------------------------------------
| Donation Expiry Service
|--------------------------------------------------------------------------
|
| A donation is considered expired when its availabilityEnd time has
| passed.
|
| We do NOT change these statuses automatically:
| - completed
| - cancelled
| - expired
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
| Expire overdue donations
|--------------------------------------------------------------------------
| Finds donations whose availability period has ended and marks them
| as expired.
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
| Check whether one donation is expired
|--------------------------------------------------------------------------
*/
function isDonationExpired(donation) {
  if (!donation) {
    return false;
  }

  // These statuses should never be changed by the expiry service.
  if (EXEMPT_STATUSES.includes(donation.status)) {
    return false;
  }

  if (!donation.availabilityEnd) {
    return false;
  }

  const availabilityEnd = new Date(donation.availabilityEnd);

  if (Number.isNaN(availabilityEnd.getTime())) {
    return false;
  }

  return availabilityEnd.getTime() < Date.now();
}

/*
|--------------------------------------------------------------------------
| Mark one donation as expired
|--------------------------------------------------------------------------
| Useful when a single donation is opened and we want to make sure
| its status is current.
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
  expireOverdueDonations,
  isDonationExpired,
  expireDonationIfNeeded,
};