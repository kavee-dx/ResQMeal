const express = require("express");
const router = express.Router();

const { adminLogin } = require("../controllers/amasha-admin-authController");
const { requireAdmin } = require("../middleware/amasha-admin-authMiddleware");
const {
  getPendingUsers,
  getUserDetails,
  approve,
  reject,
} = require("../controllers/amasha-admin-userVerificationController");

router.post("/login", adminLogin); // public

router.get("/users/pending", requireAdmin, getPendingUsers);
router.get("/users/:id", requireAdmin, getUserDetails);
router.post("/users/:id/approve", requireAdmin, approve);
router.post("/users/:id/reject", requireAdmin, reject);

module.exports = router;