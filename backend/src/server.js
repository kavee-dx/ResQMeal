const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const registrationRoutes = require("./routes/dushani-registrationRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
connectDB();

app.get("/", (req, res) => {
  res.send("ResQMeal Backend Running");
});

app.use("/api/auth", registrationRoutes);

const PORT = process.env.PORT || 5000;

app.get("/api/test", (req, res) => {
  res.json({
    message: "Frontend connected to backend successfully",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});