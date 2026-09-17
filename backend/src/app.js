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
const adminRoutes = require("./routes/amasha-admin-routes");
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
app.use("/api/admin", adminRoutes);

app.use("/api/auth", passwordResetRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/upload", uploadRoutes);
app.get("/api/test", (req, res) => {
  res.json({
    message: "Frontend connected to backend successfully",
  });
});

module.exports = app;