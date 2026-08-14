const express = require("express");
const cors = require("cors");

const registrationRoutes = require("./routes/dushani-registrationRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ResQMeal Backend Running");
});

app.use("/api/auth", registrationRoutes);

app.get("/api/test", (req, res) => {
  res.json({
    message: "Frontend connected to backend successfully",
  });
});

module.exports = app;