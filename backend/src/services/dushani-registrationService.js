// backend/src/services/dushani-registrationService.js
// Task 02 — Implement Registration API Endpoint (business logic layer)
// Owner: Dushani
// Git commit: feat(auth): implement registration API endpoint
//
// Creates the shared User record, then creates the role-specific profile
// (DonorProfile / RecipientProfile / NGOProfile / VolunteerProfile).
// If the profile step fails, the User record is rolled back so we never end
// up with an orphaned account.

const bcrypt = require("bcryptjs");

const User = require("../models/dushani-User");
const DonorProfile = require("../models/dushani-DonorProfile");
const RecipientProfile = require("../models/dushani-RecipientProfile");
const NGOProfile = require("../models/dushani-NGOProfile");
const VolunteerProfile = require("../models/dushani-VolunteerProfile");

const {
  generateVerificationCode,
  getExpiryDate,
} = require("../utils/dushani-otp");

const {
  sendVerificationEmail,
} = require("../utils/dushani-email");

const SALT_ROUNDS = 10;

function optional(v) {
  const trimmed =
    typeof v === "string"
      ? v.trim()
      : v;

  return trimmed || undefined;
}

async function registerUser(input) {
  const email = optional(input.email)?.toLowerCase();

  // --------------------------------------------------------
  // Duplicate checks
  // --------------------------------------------------------

  if (
    email &&
    (await User.findOne({ email }))
  ) {
    throw new Error(
      "EMAIL_ALREADY_REGISTERED"
    );
  }

  if (
    await User.findOne({
      phoneNumber: input.phoneNumber,
    })
  ) {
    throw new Error(
      "PHONE_ALREADY_REGISTERED"
    );
  }

  // --------------------------------------------------------
  // Password validation
  // --------------------------------------------------------

  if (
    input.password !==
    input.confirmPassword
  ) {
    throw new Error(
      "PASSWORDS_DO_NOT_MATCH"
    );
  }

  // --------------------------------------------------------
  // Donor validation
  // --------------------------------------------------------

  if (
    input.role === "DONOR" &&
    input.donorType === "OTHER" &&
    !optional(input.specifiedDonorType)
  ) {
    throw new Error(
      "SPECIFY_DONOR_TYPE"
    );
  }

  // Business donor types require a business
  // registration number.
  if (
    input.role === "DONOR" &&
    input.donorType !== "INDIVIDUAL" &&
    !optional(
      input.businessRegistrationNumber
    )
  ) {
    throw new Error(
      "BUSINESS_REGISTRATION_REQUIRED"
    );
  }

  // --------------------------------------------------------
  // Recipient validation
  // --------------------------------------------------------

  if (
    input.role === "RECIPIENT" &&
    input.recipientType === "OTHER" &&
    !optional(
      input.specifiedRecipientType
    )
  ) {
    throw new Error(
      "SPECIFY_RECIPIENT_TYPE"
    );
  }

  // At least one food requirement is required
  // for every recipient.
  if (
    input.role === "RECIPIENT" &&
    (!Array.isArray(
      input.foodRequirements
    ) ||
      input.foodRequirements.length === 0)
  ) {
    throw new Error(
      "FOOD_REQUIREMENTS_REQUIRED"
    );
  }

  // --------------------------------------------------------
  // NGO validation
  // --------------------------------------------------------

  if (
    input.role === "NGO" &&
    input.organizationType === "OTHER" &&
    !optional(
      input.specifiedOrganizationType
    )
  ) {
    throw new Error(
      "SPECIFY_NGO_TYPE"
    );
  }

  // --------------------------------------------------------
  // Volunteer validation
  // --------------------------------------------------------

  if (
    input.role === "VOLUNTEER"
  ) {
    const needsVehicleNumber = [
      "MOTORBIKE",
      "THREE_WHEELER",
      "CAR",
      "VAN",
      "OTHER",
    ].includes(
      input.vehicleType
    );

    if (
      needsVehicleNumber &&
      !optional(
        input.vehicleNumber
      )
    ) {
      throw new Error(
        "VEHICLE_NUMBER_REQUIRED"
      );
    }
  }

  // --------------------------------------------------------
  // Password & verification code
  // --------------------------------------------------------

  const hashedPassword =
    await bcrypt.hash(
      input.password,
      SALT_ROUNDS
    );

  const verificationCode =
    generateVerificationCode();

  const verificationCodeExpires =
    getExpiryDate(15);

  // --------------------------------------------------------
  // Create shared User
  // --------------------------------------------------------

  const user = await User.create({
    fullName:
      optional(input.fullName),

    email,

    phoneNumber:
      input.phoneNumber.trim(),

    password:
      hashedPassword,

    role:
      input.role,

    profilePicture:
      optional(
        input.profilePicture
      ) ||
      optional(
        input.businessLogo
      ) ||
      optional(
        input.organizationLogo
      ),

    address:
      input.address.trim(),

    district:
      input.district.trim(),

    city:
      input.city.trim(),

    isVerified:
      false,

    verificationCode,

    verificationCodeExpires,
  });

  try {
    // ------------------------------------------------------
    // Create role-specific profile
    // ------------------------------------------------------

    if (
      input.role === "DONOR"
    ) {
      await createDonorProfile(
        user,
        input
      );
    }

    if (
      input.role === "RECIPIENT"
    ) {
      await createRecipientProfile(
        user,
        input
      );
    }

    if (
      input.role === "NGO"
    ) {
      await createNgoProfile(
        user,
        input
      );
    }

    if (
      input.role === "VOLUNTEER"
    ) {
      await createVolunteerProfile(
        user,
        input
      );
    }
  } catch (err) {
    // Roll back User if profile creation fails.
    await User.findByIdAndDelete(
      user._id
    );

    throw err;
  }

  await sendVerificationEmail(
    email || input.phoneNumber,
    verificationCode
  );

  return {
    user,
    verificationCode,
  };
}

// ============================================================
// DONOR PROFILE
// ============================================================

async function createDonorProfile(
  user,
  input
) {
  const isBusiness =
    input.donorType !==
    "INDIVIDUAL";

  await DonorProfile.create({
    userId:
      user._id,

    donorType:
      input.donorType,

    specifiedDonorType:
      optional(
        input.specifiedDonorType
      ),

    businessName:
      isBusiness
        ? input.businessName
        : undefined,

    businessType:
      isBusiness
        ? input.donorType ===
          "OTHER"
          ? input.specifiedDonorType
          : input.donorType
        : undefined,

    authorizedPerson:
      isBusiness
        ? input.authorizedPerson
        : undefined,

    position:
      isBusiness
        ? input.position
        : undefined,

    businessRegistrationNumber:
      isBusiness
        ? input.businessRegistrationNumber
        : undefined,

    businessContactNumber:
      isBusiness
        ? input.businessContactNumber
        : undefined,

    businessEmail:
      isBusiness
        ? optional(
            input.businessEmail
          )
        : undefined,

    businessLogo:
      isBusiness
        ? optional(
            input.businessLogo
          )
        : undefined,

    website:
      isBusiness
        ? optional(
            input.website
          )
        : undefined,

    description:
      isBusiness
        ? optional(
            input.description
          )
        : undefined,
  });
}

// ============================================================
// RECIPIENT PROFILE
// ============================================================

async function createRecipientProfile(
  user,
  input
) {
  const isOrganization =
    input.recipientType !==
      "INDIVIDUAL" &&
    input.recipientType !==
      "FAMILY";

  await RecipientProfile.create({
    userId:
      user._id,

    recipientType:
      input.recipientType,

    specifiedRecipientType:
      optional(
        input.specifiedRecipientType
      ),

    organizationName:
      isOrganization
        ? input.organizationName
        : undefined,

    organizationRegistrationNumber:
      isOrganization
        ? input.organizationRegistrationNumber
        : undefined,

    authorizedPerson:
      isOrganization
        ? input.authorizedPerson
        : undefined,

    position:
      isOrganization
        ? input.position
        : undefined,

    website:
      isOrganization
        ? optional(
            input.website
          )
        : undefined,

    description:
      isOrganization
        ? optional(
            input.description
          )
        : undefined,

    peopleNeedingFood:
      Number(
        input.peopleNeedingFood
      ),

    foodRequirements:
      input.foodRequirements,

    specialRequirements:
      optional(
        input.specialRequirements
      ),
  });
}

// ============================================================
// NGO PROFILE
// ============================================================

async function createNgoProfile(
  user,
  input
) {
  await NGOProfile.create({
    userId:
      user._id,

    organizationName:
      input.organizationName,

    ngoRegistrationNumber:
      input.ngoRegistrationNumber,

    organizationType:
      input.organizationType,

    specifiedOrganizationType:
      optional(
        input.specifiedOrganizationType
      ),

    authorizedPerson:
      input.authorizedPerson,

    position:
      input.position,

    website:
      optional(
        input.website
      ),

    description:
      optional(
        input.description
      ),

    organizationLogo:
      optional(
        input.organizationLogo
      ),
  });
}

// ============================================================
// VOLUNTEER PROFILE
// ============================================================

async function createVolunteerProfile(
  user,
  input
) {
  await VolunteerProfile.create({
    userId:
      user._id,

    vehicleType:
      input.vehicleType,

    vehicleNumber:
      optional(
        input.vehicleNumber
      ),

    preferredDeliveryArea:
      input.preferredDeliveryArea,

    preferredDeliveryTime:
      optional(
        input.preferredDeliveryTime
      ),
  });
}

module.exports = {
  registerUser,
};