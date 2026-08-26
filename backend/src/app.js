const express = require("express");
const cors = require("cors");
const registrationRoutes = require("./routes/dushani-registrationRoutes");
const loginRoutes = require("./routes/kaveesha-loginRoutes");
const privacySettingsRoutes = require("./routes/amasha-privacySettingsRoutes");
const notificationSettingsRoutes = require("./routes/amasha-notificationSettingsRoutes");
const accountDeletionRoutes = require("./routes/amasha-accountDeletionRoutes");
const profileRoutes = require("./routes/dilshara-profileRoutes");
const passwordResetRoutes = require("./routes/kaveesha-passwordResetRoutes");
const uploadRoutes = require("./routes/dilshara-uploadRoutes");
const createDonationRoute = require("./routes/kaveesha-createDonation.route");
const getDonationsRoute = require("./routes/kaveesha-getDonations.route");
const updateDonationRoute = require("./routes/kaveesha-updateDonation.route");
const deleteDonationRoute = require("./routes/kaveesha-deleteDonation.route");

const app = express();
// Middleware
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("ResQMeal Backend Running");
});
app.use("/api/auth", registrationRoutes);
app.use("/api/auth", loginRoutes);
app.use("/api/settings", privacySettingsRoutes);
app.use("/api/settings", notificationSettingsRoutes);
app.use("/api/settings", accountDeletionRoutes);
app.use("/api/auth", passwordResetRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/donor/donations", updateDonationRoute);
app.use("/api/donor/donations", deleteDonationRoute);
app.use("/api/donor/donations", createDonationRoute);
app.use("/api/donor/donations", getDonationsRoute);
app.get("/api/test", (req, res) => {
  res.json({
    message: "Frontend connected to backend successfully",
  });
});
module.exports = app;