// backend/src/routes/dushani-registrationRoutes.js
// Wiring for Task 02 (register) and Task 04 (verify) endpoints.
// NOTE: login / password-reset routes (Kavee, Epic 02) are added separately
// by the teammate owning that epic — this file only wires Dushani's routes.
// Owner: Dushani

const express = require("express");
const router = express.Router();

const { register } = require("../controllers/dushani-registerController");
//const { verify, resendVerification } = require("../controllers/dushani-verifyController");
//const validateRegistration = require("../middleware/dushani-validateRegistration");

// router.post("/register", validateRegistration, register);
// router.post("/verify", verify);
// router.post("/verify/resend", resendVerification);

module.exports = router;
