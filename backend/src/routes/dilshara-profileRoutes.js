const express = require("express");
const router = express.Router();
const { getProfile, updateProfile } = require("../controllers/dilshara-profileController");

router.get("/", getProfile);
router.patch("/", updateProfile);

module.exports = router;