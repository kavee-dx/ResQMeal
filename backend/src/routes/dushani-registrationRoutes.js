const express = require("express");
const router = express.Router();

const { register } = require("../controllers/dushani-registerController");
const { verify, resendVerification } = require("../controllers/dushani-verifyController");

router.post("/register", register);
router.post("/verify", verify);
router.post("/verify/resend", resendVerification);

module.exports = router;
