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
const foodRequestRoutes = require("./routes/dushani-foodRequestRoutes");
const { expireOverdueDonations } = require("./services/kaveesha-donationExpiryService");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.get("/", (req, res) => {
  res.send("ResQMeal Backend Running");
});

app.use("/api/auth", registrationRoutes);
app.use("/api/auth", loginRoutes);
app.use("/api/settings", privacySettingsRoutes);
app.use("/api/settings", notificationSettingsRoutes);
app.use("/api/settings", accountDeletionRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/auth", passwordResetRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/upload", uploadRoutes);
// Donor Donation Routes
app.use("/api/donor/donations", createDonationRoute);
app.use("/api/donor/donations", getDonationsRoute);
app.use("/api/donor/donations", updateDonationRoute);
app.use("/api/donor/donations", deleteDonationRoute);

app.use("/api/recipient/food-requests", foodRequestRoutes);
app.use("/api/donations", require("./routes/kaveesha-donationAnalysisRoutes"));
app.use("/api/voice", require("./routes/kaveesha-voiceAssistantRoutes"));
app.get("/api/test", (req, res) => {
  res.json({
    message: "Frontend connected to backend successfully",
  });
});

cron.schedule("*/15 * * * *", async () => {
  try {
    const count = await expireOverdueDonations();
    if (count > 0) {
      console.log(`Expired ${count} donation(s).`);
    }
  } catch (err) {
    console.error("Donation expiry job failed:", err);
  }
});

// Run an expiry check immediately when the backend starts.
expireOverdueDonations()
  .then((count) => {
    if (count > 0) {
      console.log(
        `Initial expiry check: expired ${count} donation(s).`
      );
    }
  })
  .catch((err) => {
    console.error(
      "Initial donation expiry check failed:",
      err
    );
  });

module.exports = app;