const { loginAdmin } = require("../services/amasha-admin-authService");
const { signAdminToken } = require("../utils/amasha-admin-jwt");

const ERROR_MESSAGES = {
  MISSING_CREDENTIALS: { status: 400, message: "Email and password are required." },
  INVALID_CREDENTIALS: { status: 401, message: "Incorrect email or password." },
};

function handleKnownError(error, res) {
  const known = ERROR_MESSAGES[error.message];
  if (known) return res.status(known.status).json({ success: false, message: known.message });
  console.error(error);
  return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
}

async function adminLogin(req, res) {
  try {
    const admin = await loginAdmin(req.body);
    const token = signAdminToken(admin);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      role: admin.role,
      token,
      admin: { id: admin._id, fullName: admin.fullName, email: admin.email, role: admin.role },
    });
  } catch (error) {
    return handleKnownError(error, res);
  }
}

module.exports = { adminLogin };