// backend/src/controllers/dushani-registerController.js
// Task 02 — Implement Registration API Endpoint
// Owner: Dushani
// Git commit: feat(auth): implement registration API endpoint

const {
  registerUser,
} = require("../services/dushani-registrationService");

const ERROR_MESSAGES = {
  EMAIL_ALREADY_REGISTERED: {
    status: 409,
    message: "Email is already registered.",
  },

  PHONE_ALREADY_REGISTERED: {
    status: 409,
    message: "Phone number is already registered.",
  },

  SPECIFY_DONOR_TYPE: {
    status: 400,
    message: "Please specify your donor type.",
  },

  SPECIFY_RECIPIENT_TYPE: {
    status: 400,
    message: "Please specify your recipient type.",
  },

  SPECIFY_NGO_TYPE: {
    status: 400,
    message: "Please specify your organization type.",
  },

  VEHICLE_NUMBER_REQUIRED: {
    status: 400,
    message: "Vehicle number is required for this vehicle type.",
  },

  BUSINESS_REGISTRATION_REQUIRED: {
    status: 400,
    message: "Business registration number is required.",
    field: "businessRegistrationNumber",
  },

  FOOD_REQUIREMENTS_REQUIRED: {
    status: 400,
    message: "Please select at least one food requirement.",
    field: "foodRequirements",
  },

  PASSWORDS_DO_NOT_MATCH: {
    status: 400,
    message: "Passwords do not match.",
    field: "confirmPassword",
  },
};

function handleKnownError(error, res) {
  const known = ERROR_MESSAGES[error.message];

  if (known) {
    const response = {
      success: false,
      message: known.message,
    };

    // Include field information for validation errors
    if (known.field) {
      response.errors = [
        {
          field: known.field,
          message: known.message,
        },
      ];
    }

    return res.status(known.status).json(response);
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again.",
  });
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { user } = await registerUser(req.body);

    return res.status(201).json({
      success: true,

      message:
        "Registration successful. Please verify your account using the code sent to your email.",

      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    return handleKnownError(error, res);
  }
}

module.exports = {
  register,
};