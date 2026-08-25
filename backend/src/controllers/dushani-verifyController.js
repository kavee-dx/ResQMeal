
const { verifyAccount, resendVerificationCode } = require("../services/dushani-verificationService");

const ERROR_MESSAGES = {
  USER_NOT_FOUND: { status: 404, message: "No account found for this email." },
  ALREADY_VERIFIED: { status: 409, message: "This account is already verified." },
  INVALID_CODE: { status: 400, message: "The verification code is incorrect." },
  CODE_EXPIRED: { status: 400, message: "The verification code has expired. Please request a new one." },
};

function handleKnownError(error, res) {
  const known = ERROR_MESSAGES[error.message];
  if (known) {
    return res.status(known.status).json({ success: false, message: known.message });
  }
  console.error(error);
  return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
}

// POST /api/auth/verify
async function verify(req, res) {
  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ success: false, message: "Email and verification code are required." });
  }

  try {
    const user = await verifyAccount(email, code);
    return res.status(200).json({
      success: true,
      message: "Account verified successfully. You can now log in.",
      user: { id: user._id, email: user.email, isVerified: user.isVerified },
    });
  } catch (error) {
    return handleKnownError(error, res);
  }
}

// POST /api/auth/verify/resend
async function resendVerification(req, res) {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  try {
    await resendVerificationCode(email);
    return res.status(200).json({ success: true, message: "A new verification code has been sent." });
  } catch (error) {
    return handleKnownError(error, res);
  }
}

module.exports = { verify, resendVerification };
