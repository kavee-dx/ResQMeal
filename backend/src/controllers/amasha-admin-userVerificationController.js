const {
  listPendingUsers,
  getUserForReview,
  approveUser,
  rejectUser,
} = require("../services/amasha-admin-userVerificationService");

async function getPendingUsers(req, res) {
  try {
    const results = await listPendingUsers({ role: req.query.role });
    return res.status(200).json({ success: true, count: results.length, results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
}

async function getUserDetails(req, res) {
  try {
    const result = await getUserForReview(req.params.id);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    console.error(error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
}

async function approve(req, res) {
  try {
    const user = await approveUser(req.params.id, req.admin.id);
    return res.status(200).json({
      success: true,
      message: "User approved. A confirmation email has been sent.",
      user: { id: user._id, email: user.email, approvalStatus: user.approvalStatus },
    });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") return res.status(404).json({ success: false, message: "User not found." });
    if (error.message === "ALREADY_APPROVED") return res.status(409).json({ success: false, message: "User is already approved." });
    console.error(error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
}

async function reject(req, res) {
  try {
    const user = await rejectUser(req.params.id, req.admin.id, req.body?.reason);
    return res.status(200).json({
      success: true,
      message: "User rejected.",
      user: { id: user._id, email: user.email, approvalStatus: user.approvalStatus },
    });
  } catch (error) {
    if (error.message === "USER_NOT_FOUND") return res.status(404).json({ success: false, message: "User not found." });
    console.error(error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
}

module.exports = { getPendingUsers, getUserDetails, approve, reject };