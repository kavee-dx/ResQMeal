// backend/src/app.js

const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const registrationRoutes = require("./routes/dushani-registrationRoutes");
const loginRoutes = require("./routes/kaveesha-loginRoutes");
const privacySettingsRoutes = require("./routes/amasha-privacySettingsRoutes");
const notificationSettingsRoutes = require("./routes/amasha-notificationSettingsRoutes");
const accountDeletionRoutes = require("./routes/amasha-accountDeletionRoutes");
const profileRoutes = require("./routes/dilshara-profileRoutes");
const passwordResetRoutes = require("./routes/kaveesha-passwordResetRoutes");
const uploadRoutes = require("./routes/dilshara-uploadRoutes");
const adminRoutes = require("./routes/amasha-admin-routes");

const createDonationRoute = require("./routes/kaveesha-createDonation.route");
const getDonationsRoute = require("./routes/kaveesha-getDonations.route");
const updateDonationRoute = require("./routes/kaveesha-updateDonation.route");
const deleteDonationRoute = require("./routes/kaveesha-deleteDonation.route");
const expiryAlertRoutes = require("./routes/kaveesha-expiryAlertRoutes");
const pushNotificationRoutes = require("./routes/kaveesha-pushNotificationRoutes");

const foodRequestRoutes = require("./routes/dushani-foodRequestRoutes");

const volunteerAvailabilityRoutes = require("./routes/dilshara-volunteerAvailability.routes");
const assignmentRoutes = require("./routes/dilshara-assignmentRoutes");

const {
  generateExpiryAlerts,
  expireOverdueDonations,
} = require("./services/kaveesha-donationExpiryService");

const app = express();

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(cors());

app.use(
  express.json({
    limit: "15mb",
  })
);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.send("ResQMeal Backend Running");
});

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", registrationRoutes);
app.use("/api/auth", loginRoutes);
app.use("/api/auth", passwordResetRoutes);

/*
|--------------------------------------------------------------------------
| Settings Routes
|--------------------------------------------------------------------------
*/

app.use("/api/settings", privacySettingsRoutes);
app.use("/api/settings", notificationSettingsRoutes);
app.use("/api/settings", accountDeletionRoutes);

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/

app.use("/api/admin", adminRoutes);

/*
|--------------------------------------------------------------------------
| Profile / Upload Routes
|--------------------------------------------------------------------------
*/

app.use("/api/profile", profileRoutes);
app.use("/api/upload", uploadRoutes);

/*
|--------------------------------------------------------------------------
| Donor Donation Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/donor/donations",
  createDonationRoute
);

app.use(
  "/api/donor/donations",
  getDonationsRoute
);

app.use(
  "/api/donor/donations",
  updateDonationRoute
);

app.use(
  "/api/donor/donations",
  deleteDonationRoute
);

app.use(
  "/api/donor/expiry-alerts",
  expiryAlertRoutes
);

/*
|--------------------------------------------------------------------------
| Recipient Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/recipient/food-requests",
  foodRequestRoutes
);

/*
|--------------------------------------------------------------------------
| Volunteer Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/volunteer-profile",
  volunteerAvailabilityRoutes
);

app.use(
  "/api/assignments",
  assignmentRoutes
);

/*
|--------------------------------------------------------------------------
| Donation AI / Analysis Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/donations",
  require("./routes/kaveesha-donationAnalysisRoutes")
);

/*
|--------------------------------------------------------------------------
| Voice Assistant Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/voice",
  require("./routes/kaveesha-voiceAssistantRoutes")
);

/*
|--------------------------------------------------------------------------
| Map Monitoring Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/monitoring/map",
  require("./routes/amasha-mapRoutes")
);

/*
|--------------------------------------------------------------------------
| NGO Trend Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/ngo/trends",
  require("./routes/amasha-TrendRoutes")
);

/*
|--------------------------------------------------------------------------
| API Test
|--------------------------------------------------------------------------
*/

app.get("/api/test", (req, res) => {
  res.json({
    message:
      "Frontend connected to backend successfully",
  });
});

/*
|--------------------------------------------------------------------------
| Donation Rescue-Window Expiry Monitoring
|--------------------------------------------------------------------------
|
| This job runs every minute.
|
| It performs TWO tasks:
|
| 1. Generates expiry alerts based on availabilityEnd.
|
| 2. Marks donations as expired after availabilityEnd.
|
| Alert thresholds are defined inside:
|
| services/kaveesha-donationExpiryService.js
|
|--------------------------------------------------------------------------
*/

cron.schedule("* * * * *", async () => {
  try {
    /*
     * Step 1:
     * Generate alerts for donations approaching
     * the end of their rescue window.
     */
    const alertResult = await generateExpiryAlerts();

    if (
      alertResult.success &&
      alertResult.createdCount > 0
    ) {
      console.log(
        `[Expiry Alert Job] Created ${alertResult.createdCount} alert(s).`
      );
    }

    /*
     * Step 2:
     * Mark donations whose rescue window has ended
     * as expired.
     */
    const expiryResult =
      await expireOverdueDonations();

    if (
      expiryResult.success &&
      expiryResult.modifiedCount > 0
    ) {
      console.log(
        `[Donation Expiry Job] Expired ${expiryResult.modifiedCount} donation(s).`
      );
    }
  } catch (error) {
    console.error(
      "[Donation Expiry Job] Scheduled job failed:",
      error
    );
  }
});

/*
|--------------------------------------------------------------------------
| Initial Expiry Check
|--------------------------------------------------------------------------
|
| Run both checks once when the backend starts.
|
| This means we don't have to wait up to one minute
| after restarting the server for the first check.
|
|--------------------------------------------------------------------------
*/

Promise.all([
  generateExpiryAlerts(),
  expireOverdueDonations(),
])
  .then(([alertResult, expiryResult]) => {
    /*
     * Initial alert generation result.
     */
    if (
      alertResult.success &&
      alertResult.createdCount > 0
    ) {
      console.log(
        `[Initial Expiry Alert Check] Created ${alertResult.createdCount} alert(s).`
      );
    }

    /*
     * Initial donation expiry result.
     */
    if (
      expiryResult.success &&
      expiryResult.modifiedCount > 0
    ) {
      console.log(
        `[Initial Donation Expiry Check] Expired ${expiryResult.modifiedCount} donation(s).`
      );
    }
  })
  .catch((error) => {
    console.error(
      "[Initial Expiry Check] Failed:",
      error
    );
  });

/*
|--------------------------------------------------------------------------
| Export App
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Push Notification Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/notifications",
  pushNotificationRoutes
);

module.exports = app;