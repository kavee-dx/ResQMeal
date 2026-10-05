const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");

const app = express();

// Authentication routes
const registrationRoutes = require("./routes/dushani-registrationRoutes");
const loginRoutes = require("./routes/kaveesha-loginRoutes");
const passwordResetRoutes = require("./routes/kaveesha-passwordResetRoutes");

// Settings routes
const privacySettingsRoutes = require("./routes/amasha-privacySettingsRoutes");
const notificationSettingsRoutes = require("./routes/amasha-notificationSettingsRoutes");
const accountDeletionRoutes = require("./routes/amasha-accountDeletionRoutes");

// Profile, upload and admin routes
const profileRoutes = require("./routes/dilshara-profileRoutes");
const uploadRoutes = require("./routes/dilshara-uploadRoutes");
const adminRoutes = require("./routes/amasha-admin-routes");

// Donation routes
const createDonationRoute = require("./routes/kaveesha-createDonation.route");
const getDonationsRoute = require("./routes/kaveesha-getDonations.route");
const updateDonationRoute = require("./routes/kaveesha-updateDonation.route");
const deleteDonationRoute = require("./routes/kaveesha-deleteDonation.route");
const expiryAlertRoutes = require("./routes/kaveesha-expiryAlertRoutes");
const pushNotificationRoutes = require("./routes/kaveesha-pushNotificationRoutes");

// Food request and recipient routes
const foodRequestRoutes = require("./routes/dushani-foodRequestRoutes");
const recipientSuggestionRoutes = require("./routes/dilshara-recipientSuggestion.routes");

// Volunteer routes
const volunteerAvailabilityRoutes = require("./routes/dilshara-volunteerAvailability.routes");
const assignmentRoutes = require("./routes/dilshara-assignmentRoutes");
const deliveryPreferencesRoutes = require("./routes/dilshara-deliveryPreferences.routes");

// Donation expiry services
const {
  generateExpiryAlerts,
  expireOverdueDonations,
} = require("./services/kaveesha-donationExpiryService");

// Middleware
app.use(cors());

app.use(
  express.json({
    limit: "15mb",
  })
);

// Health check
app.get("/", (req, res) => {
  res.send("ResQMeal Backend Running");
});

// Authentication routes
app.use("/api/auth", registrationRoutes);
app.use("/api/auth", loginRoutes);
app.use("/api/auth", passwordResetRoutes);

// Settings routes
app.use("/api/settings", privacySettingsRoutes);
app.use("/api/settings", notificationSettingsRoutes);
app.use("/api/settings", accountDeletionRoutes);

// Admin routes
app.use("/api/admin", adminRoutes);

// Profile and upload routes
app.use("/api/profile", profileRoutes);
app.use("/api/upload", uploadRoutes);

// Donor donation routes
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

// Recipient routes
app.use(
  "/api/recipient/food-requests",
  foodRequestRoutes
);

app.use(
  "/api/recipient-suggestions",
  recipientSuggestionRoutes
);

// Volunteer routes
app.use(
  "/api/volunteer-profile",
  volunteerAvailabilityRoutes
);

app.use(
  "/api/assignments",
  assignmentRoutes
);

app.use(
  "/api/volunteer-profile/delivery-preferences",
  deliveryPreferencesRoutes
);

// Donation analysis routes
app.use(
  "/api/donations",
  require("./routes/kaveesha-donationAnalysisRoutes")
);

// Voice assistant routes
app.use(
  "/api/voice",
  require("./routes/kaveesha-voiceAssistantRoutes")
);

// Map monitoring routes
app.use(
  "/api/monitoring/map",
  require("./routes/amasha-mapRoutes")
);

// NGO trend routes
app.use(
  "/api/ngo/trends",
  require("./routes/amasha-TrendRoutes")
);

// Campaign routes
app.use(
  "/api/campaigns",
  require("./routes/amasha-campaignRoutes")
);

// Notification routes
app.use(
  "/api/notifications",
  require("./routes/amasha-notificationRoutes")
);

// Push notification routes
app.use(
  "/api/notifications",
  pushNotificationRoutes
);

// Serve uploaded files
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "..", "uploads")
  )
);

// API test
app.get("/api/test", (req, res) => {
  res.json({
    message: "Frontend connected to backend successfully",
  });
});

// Run donation expiry checks every minute
cron.schedule("* * * * *", async () => {
  try {
    const alertResult = await generateExpiryAlerts();

    if (
      alertResult.success &&
      alertResult.createdCount > 0
    ) {
      console.log(
        `[Expiry Alert Job] Created ${alertResult.createdCount} alert(s).`
      );
    }

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

// Run expiry checks when the backend starts
Promise.all([
  generateExpiryAlerts(),
  expireOverdueDonations(),
])
  .then(([alertResult, expiryResult]) => {
    if (
      alertResult.success &&
      alertResult.createdCount > 0
    ) {
      console.log(
        `[Initial Expiry Alert Check] Created ${alertResult.createdCount} alert(s).`
      );
    }

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

module.exports = app;

