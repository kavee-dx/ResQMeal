const express = require("express");
const router = express.Router();
const upload = require("../middleware/dilshara-upload");
const { uploadProfilePicture } = require("../controllers/dilshara-uploadController");

router.post("/profile-picture", upload.single("image"), uploadProfilePicture);

module.exports = router;