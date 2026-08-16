require("dotenv").config();

const connectDB = require("./config/db");
const app = require("./app");

connectDB();

app.get("/", (req, res) => {
  res.send("ResQMeal Backend Running");
});

app.use("/api/auth", registrationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});