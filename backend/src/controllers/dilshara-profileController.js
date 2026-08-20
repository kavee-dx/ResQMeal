// const {
//   getMergedProfile,
//   updateMergedProfile,
// } = require("../services/dilshara-profileService");

// // TEMPORARY: reading userId from a header until login/JWT exists.
// // Once auth middleware is ready, replace req.headers["x-user-id"]
// // with req.user.id everywhere in this file.
// async function getProfile(req, res) {
//   const userId = req.user?.id || req.user?._id;
//   if (!userId) {
//     return res.status(401).json({ success: false, message: "Not authenticated." });
//   }
//   try {
//     const profile = await getMergedProfile(userId);
//     return res.status(200).json({ success: true, profile });
//   } catch (err) {
//     return res.status(404).json({ success: false, message: "Profile not found." });
//   }
// }

// async function updateProfile(req, res) {
//   const userId = req.user?.id || req.user?._id;
//   if (!userId) {
//     return res.status(401).json({ success: false, message: "Not authenticated." });
//   }
//   try {
//     const profile = await updateMergedProfile(userId, req.body);
//     return res.status(200).json({ success: true, profile });
//   } catch (err) {
//     return res.status(400).json({ success: false, message: "Could not update profile." });
//   }
// }

// module.exports = { getProfile, updateProfile };


const {
  getMergedProfile,
  updateMergedProfile,
} = require("../services/dilshara-profileService");

const ERROR_MESSAGES = {
  USER_NOT_FOUND: { status: 404, message: "Profile not found." },
  ACCOUNT_NOT_ACTIVE: {
    status: 403,
    message: "Your account is restricted or inactive. Profile updates are disabled — contact support.",
  },
};

function handleKnownError(error, res, fallbackStatus) {
  const known = ERROR_MESSAGES[error.message];
  if (known) {
    return res.status(known.status).json({ success: false, message: known.message });
  }
  console.error(error);
  return res.status(fallbackStatus).json({ success: false, message: "Something went wrong." });
}

async function getProfile(req, res) {
  const userId = req.user.id; // set by requireAuth middleware — decoded JWT payload
  try {
    const profile = await getMergedProfile(userId);
    return res.status(200).json({ success: true, profile });
  } catch (err) {
    return handleKnownError(err, res, 404);
  }
}

async function updateProfile(req, res) {
  const userId = req.user.id;
  try {
    const profile = await updateMergedProfile(userId, req.body);
    return res.status(200).json({ success: true, profile });
  } catch (err) {
    return handleKnownError(err, res, 400);
  }
}

module.exports = { getProfile, updateProfile };