const express = require("express");
const router = express.Router();

const {
  requestPasswordReset,
  verifyResetOtp,
} = require("../controllers/kaveesha-forgotPasswordController");
const { resetPassword } = require("../controllers/kaveesha-resetPasswordController");

router.post("/forgot-password", requestPasswordReset);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

module.exports = router;