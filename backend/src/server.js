const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");


const app = express();


// Middleware
app.use(cors());
app.use(express.json());


// MongoDB connection
connectDB();


app.get("/", (req, res) => {
    res.send("ResQMeal Backend Running");
});


const PORT = process.env.PORT || 5000;


app.get("/api/test", (req, res) => {
    res.json({
        message: "Frontend connected to backend successfully"
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});