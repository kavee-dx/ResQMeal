// backend/src/controllers/kaveesha-loginController.js
// Task 07 — Implement Authentication API Endpoint
// Owner: Kavee
// Git commit: feat(auth): implement login API endpoint
//
// Response shape and status codes match what kaveesha-LoginScreen.tsx
// already expects:
//   200 -> { success, message, role, user }
//   401 -> incorrect email or password
//   403 -> account not verified yet
//   404 -> no account found

const { loginUser } = require("../services/kaveesha-loginService");
const { signToken } = require("../utils/kaveesha-jwt");

const ERROR_MESSAGES = {
  MISSING_CREDENTIALS: {
    status: 400,
    message: "Email and password are required.",
  },

  USER_NOT_FOUND: {
    status: 401,
    message: "Incorrect email or password.",
  },

  INVALID_CREDENTIALS: {
    status: 401,
    message: "Incorrect email or password.",
  },

  ACCOUNT_NOT_VERIFIED: {
    status: 403,
    message:
      "Your account is not verified yet. Please check your email for the verification code.",
  },

  ACCOUNT_PENDING_APPROVAL: {
    status: 403,
    message:
      "Your account is awaiting verification by our team. We'll email you once it's approved.",
  },
  ACCOUNT_REJECTED: {
    status: 403,
    message: "Your registration could not be verified. Please contact support.",
  },
};

function handleKnownError(error, res) {
  const known = ERROR_MESSAGES[error.message];

  if (known) {
    return res.status(known.status).json({
      success: false,
      message: known.message,
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again.",
  });
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const user = await loginUser(req.body);
    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful. Welcome back!",

      // Top-level role, so response.data.role works directly
      // on the frontend without digging into user.role.
      role: user.role,

      // Session token — frontend stores this and sends it as
      // "Authorization: Bearer <token>" on protected requests.
      token,

      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    return handleKnownError(error, res);
  }
}

module.exports = { login };
