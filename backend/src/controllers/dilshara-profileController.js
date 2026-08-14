const {
  getMergedProfile,
  updateMergedProfile,
} = require("../services/dilshara-profileService");

// TEMPORARY: reading userId from a header until login/JWT exists.
// Once auth middleware is ready, replace req.headers["x-user-id"]
// with req.user.id everywhere in this file.

async function getProfile(req, res) {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ success: false, message: "Missing x-user-id header (temporary auth)." });
  }

  try {
    const profile = await getMergedProfile(userId);
    return res.status(200).json({ success: true, profile });
  } catch (err) {
    return res.status(404).json({ success: false, message: "Profile not found." });
  }
}

async function updateProfile(req, res) {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return res.status(401).json({ success: false, message: "Missing x-user-id header (temporary auth)." });
  }

  try {
    const profile = await updateMergedProfile(userId, req.body);
    return res.status(200).json({ success: true, profile });
  } catch (err) {
    return res.status(400).json({ success: false, message: "Could not update profile." });
  }
}

module.exports = { getProfile, updateProfile };