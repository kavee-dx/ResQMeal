// backend/src/middleware/dushani-validateRegistration.js
// Task 03 — Implement Registration Field Validation
// Owner: Dushani
// Git commit: feat(auth): add registration field validation
//
// Validates common fields for every role, then branches per role/type:
//   DONOR      -> individual vs business (Hotel/Restaurant/.../Other)
//   RECIPIENT  -> individual/family vs organization (Charity/School/.../Other)
//   NGO        -> always organization-style
//   VOLUNTEER  -> vehicleNumber only required for certain vehicle types

const ROLES = ["DONOR", "RECIPIENT", "NGO", "VOLUNTEER"];

const DONOR_TYPES = [
  "INDIVIDUAL",
  "HOTEL",
  "RESTAURANT",
  "BAKERY",
  "SUPERMARKET",
  "CATERING",
  "EVENT_ORGANIZER",
  "OTHER",
];

const RECIPIENT_TYPES = [
  "INDIVIDUAL",
  "FAMILY",
  "CHARITY",
  "COMMUNITY_CENTER",
  "SCHOOL",
  "DISASTER_RELIEF_ORGANIZATION",
  "OTHER",
];

const NGO_TYPES = [
  "NON_PROFIT_ORGANIZATION",
  "CHARITY",
  "COMMUNITY_ORGANIZATION",
  "RELIEF_ORGANIZATION",
  "SOCIAL_SERVICE_ORGANIZATION",
  "OTHER",
];

const VEHICLE_TYPES = [
  "WALKING",
  "BICYCLE",
  "MOTORBIKE",
  "THREE_WHEELER",
  "CAR",
  "VAN",
  "OTHER",
];

const VEHICLE_TYPES_REQUIRING_NUMBER = [
  "MOTORBIKE",
  "THREE_WHEELER",
  "CAR",
  "VAN",
  "OTHER",
];

/*
 * ============================================================
 * SRI LANKAN PHONE NUMBER VALIDATION
 * ============================================================
 *
 * Mobile Prefixes:
 * 070 - Mobitel
 * 071 - Mobitel
 * 072 - Hutch
 * 074 - Dialog
 * 075 - Airtel / Hutch
 * 076 - Dialog
 * 077 - Dialog
 * 078 - Hutch
 *
 * Regional Landline Area Codes:
 * 011 - Colombo
 * 021 - Jaffna
 * 023 - Mannar
 * 024 - Vavuniya
 * 025 - Anuradhapura
 * 026 - Trincomalee
 * 027 - Polonnaruwa
 * 031 - Negombo
 * 032 - Chilaw
 * 033 - Gampaha
 * 034 - Kalutara
 * 035 - Kegalle
 * 036 - Avissawella
 * 037 - Kurunegala
 * 038 - Panadura
 * 041 - Matara
 * 045 - Ratnapura
 * 047 - Hambantota
 * 051 - Hatton
 * 052 - Nuwara Eliya
 * 054 - Nawalapitiya
 * 055 - Badulla
 * 057 - Bandarawela
 * 063 - Ampara
 * 065 - Batticaloa
 * 066 - Matale
 * 067 - Kalmunai
 * 081 - Kandy
 * 091 - Galle
 *
 * All accepted numbers must contain exactly 10 digits.
 */

const MOBILE_PREFIXES = [
  "070",
  "071",
  "072",
  "074",
  "075",
  "076",
  "077",
  "078",
];

const LANDLINE_AREA_CODES = [
  "011",
  "021",
  "023",
  "024",
  "025",
  "026",
  "027",
  "031",
  "032",
  "033",
  "034",
  "035",
  "036",
  "037",
  "038",
  "041",
  "045",
  "047",
  "051",
  "052",
  "054",
  "055",
  "057",
  "063",
  "065",
  "066",
  "067",
  "081",
  "091",
];

const SRI_LANKAN_PHONE_PREFIXES = [
  ...MOBILE_PREFIXES,
  ...LANDLINE_AREA_CODES,
];

const PHONE_REGEX = new RegExp(
  `^(?:${SRI_LANKAN_PHONE_PREFIXES.join("|")})[0-9]{7}$`
);

/*
 * ============================================================
 * OTHER VALIDATION REGEX
 * ============================================================
 */

// Email must end with .com
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.com$/i;

// Password:
// - Minimum 8 characters
// - At least one uppercase letter
// - At least one lowercase letter
// - At least one number
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;

// Address:
// - Minimum 5 characters
// - Must contain at least one letter
// - Must contain at least one number
const ADDRESS_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{5,}$/;

// URL validation
const URL_REGEX = /^https?:\/\/.+/;

/*
 * ============================================================
 * HELPER FUNCTIONS
 * ============================================================
 */

function isRequired(v) {
  return (
    v !== undefined &&
    v !== null &&
    String(v).trim().length > 0
  );
}

function minLen(v, n) {
  return (
    isRequired(v) &&
    String(v).trim().length >= n
  );
}

/*
 * ============================================================
 * MAIN REGISTRATION VALIDATION
 * ============================================================
 */

function validateRegistration(req, res, next) {
  const errors = [];

  const push = (field, message) =>
    errors.push({ field, message });

  const body = req.body || {};

  const {
    role,
    password,
    confirmPassword,
    address,
    district,
    city,
    phoneNumber,
  } = body;

  /*
   * ----------------------------------------------------------
   * COMMON FIELDS FOR EVERY ROLE
   * ----------------------------------------------------------
   */

  // Role
  if (!role || !ROLES.includes(role)) {
    push(
      "role",
      `Role must be one of: ${ROLES.join(", ")}`
    );
  }

  /*
   * Phone number
   *
   * Must:
   * - contain exactly 10 digits
   * - start with a valid Sri Lankan mobile prefix
   *   OR landline area code
   */
  const normalizedPhone = String(phoneNumber || "").trim();

  if (!PHONE_REGEX.test(normalizedPhone)) {
    push(
      "phoneNumber",
      "Phone number must be a valid Sri Lankan number with exactly 10 digits."
    );
  }

  /*
   * Password
   *
   * Must:
   * - contain at least 8 characters
   * - contain uppercase letter
   * - contain lowercase letter
   * - contain number
   */
  if (!PASSWORD_REGEX.test(String(password || ""))) {
    push(
      "password",
      "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number."
    );
  }

  // Confirm password
  if (password !== confirmPassword) {
    push(
      "confirmPassword",
      "Passwords do not match."
    );
  }

  /*
   * Address
   *
   * Must:
   * - contain at least 5 characters
   * - contain letters
   * - contain numbers
   */
  if (!ADDRESS_REGEX.test(String(address || "").trim())) {
    push(
      "address",
      "Address must be at least 5 characters and contain both letters and numbers."
    );
  }

  // District
  if (!minLen(district, 2)) {
    push(
      "district",
      "District is required."
    );
  }

  // City
  if (!minLen(city, 2)) {
    push(
      "city",
      "City is required."
    );
  }

  /*
   * Optional website URL
   */
  if (
    body.website &&
    !URL_REGEX.test(body.website)
  ) {
    push(
      "website",
      "Website must be a valid URL."
    );
  }

  /*
   * ----------------------------------------------------------
   * ROLE-SPECIFIC VALIDATION
   * ----------------------------------------------------------
   */

  if (role === "DONOR") {
    validateDonor(body, push);
  }

  if (role === "RECIPIENT") {
    validateRecipient(body, push);
  }

  if (role === "NGO") {
    validateNgo(body, push);
  }

  if (role === "VOLUNTEER") {
    validateVolunteer(body, push);
  }

  /*
   * ----------------------------------------------------------
   * RETURN VALIDATION ERRORS
   * ----------------------------------------------------------
   */

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration data",
      errors,
    });
  }

  /*
   * All validation passed
   */
  next();
}

/*
 * ============================================================
 * DONOR VALIDATION
 * ============================================================
 */

function validateDonor(body, push) {
  const {
    donorType,
    specifiedDonorType,
    email,
  } = body;

  /*
   * Donor type
   */
  if (
    !donorType ||
    !DONOR_TYPES.includes(donorType)
  ) {
    push(
      "donorType",
      `Donor type must be one of: ${DONOR_TYPES.join(", ")}`
    );

    return;
  }

  /*
   * Individual donor
   */
  if (donorType === "INDIVIDUAL") {
    if (!minLen(body.fullName, 2)) {
      push(
        "fullName",
        "Full name must be at least 2 characters."
      );
    }

    if (
      !email ||
      !EMAIL_REGEX.test(email)
    ) {
      push(
        "email",
        "A valid .com email address is required."
      );
    }

    return;
  }

  /*
   * Business donor
   *
   * Hotel
   * Restaurant
   * Bakery
   * Supermarket
   * Catering
   * Event Organizer
   * Other
   */

  if (
    donorType === "OTHER" &&
    !minLen(specifiedDonorType, 2)
  ) {
    push(
      "specifiedDonorType",
      "Please specify your donor type."
    );
  }

  if (!minLen(body.businessName, 2)) {
    push(
      "businessName",
      "Business name is required."
    );
  }

  if (!minLen(body.authorizedPerson, 2)) {
    push(
      "authorizedPerson",
      "Authorized person is required."
    );
  }

  if (!minLen(body.position, 2)) {
    push(
      "position",
      "Position is required."
    );
  }

  if (
    !minLen(
      body.businessRegistrationNumber,
      2
    )
  ) {
    push(
      "businessRegistrationNumber",
      "Business registration number is required."
    );
  }

  /*
   * Business contact number uses the same
   * Sri Lankan phone number validation.
   */
  const businessContactNumber = String(
    body.businessContactNumber || ""
  ).trim();

  if (
    !PHONE_REGEX.test(businessContactNumber)
  ) {
    push(
      "businessContactNumber",
      "Business contact number must be a valid Sri Lankan number with exactly 10 digits."
    );
  }

  /*
   * Business email is optional,
   * but if provided it must be a .com email.
   */
  if (
    body.businessEmail &&
    !EMAIL_REGEX.test(body.businessEmail)
  ) {
    push(
      "businessEmail",
      "Business email must be a valid .com email address."
    );
  }
}

/*
 * ============================================================
 * RECIPIENT VALIDATION
 * ============================================================
 */

function validateRecipient(body, push) {
  const {
    recipientType,
    specifiedRecipientType,
    email,
    peopleNeedingFood,
    foodRequirements,
  } = body;

  /*
   * Recipient type
   */
  if (
    !recipientType ||
    !RECIPIENT_TYPES.includes(recipientType)
  ) {
    push(
      "recipientType",
      `Recipient type must be one of: ${RECIPIENT_TYPES.join(", ")}`
    );

    return;
  }

  /*
   * Individual / Family
   */
  const isIndividualOrFamily =
    recipientType === "INDIVIDUAL" ||
    recipientType === "FAMILY";

  if (isIndividualOrFamily) {
    if (!minLen(body.fullName, 2)) {
      push(
        "fullName",
        "Full name must be at least 2 characters."
      );
    }

    if (
      !email ||
      !EMAIL_REGEX.test(email)
    ) {
      push(
        "email",
        "A valid .com email address is required."
      );
    }
  } else {
    /*
     * Organization recipient
     */

    if (
      recipientType === "OTHER" &&
      !minLen(specifiedRecipientType, 2)
    ) {
      push(
        "specifiedRecipientType",
        "Please specify your recipient type."
      );
    }

    if (!minLen(body.organizationName, 2)) {
      push(
        "organizationName",
        "Organization name is required."
      );
    }

    if (
      !minLen(
        body.organizationRegistrationNumber,
        2
      )
    ) {
      push(
        "organizationRegistrationNumber",
        "Organization registration number is required."
      );
    }

    if (!minLen(body.authorizedPerson, 2)) {
      push(
        "authorizedPerson",
        "Authorized person is required."
      );
    }

    if (!minLen(body.position, 2)) {
      push(
        "position",
        "Position is required."
      );
    }

    /*
     * Email is optional for organization recipients,
     * but must be a valid .com email if provided.
     */
    if (
      email &&
      !EMAIL_REGEX.test(email)
    ) {
      push(
        "email",
        "Email must be a valid .com email address."
      );
    }
  }

  /*
   * Number of people needing food
   */
  const peopleCount = Number(
    peopleNeedingFood
  );

  if (
    !Number.isInteger(peopleCount) ||
    peopleCount < 1
  ) {
    push(
      "peopleNeedingFood",
      "Number of people needing food must be at least 1."
    );
  }

  /*
   * Food requirements
   */
  if (
    !Array.isArray(foodRequirements) ||
    foodRequirements.length === 0
  ) {
    push(
      "foodRequirements",
      "Please select at least one food requirement."
    );
  }
}

/*
 * ============================================================
 * NGO VALIDATION
 * ============================================================
 */

function validateNgo(body, push) {
  const {
    organizationType,
    specifiedOrganizationType,
    email,
  } = body;

  if (!minLen(body.organizationName, 2)) {
    push(
      "organizationName",
      "Organization name is required."
    );
  }

  if (
    !minLen(
      body.ngoRegistrationNumber,
      2
    )
  ) {
    push(
      "ngoRegistrationNumber",
      "NGO registration number is required."
    );
  }

  /*
   * Organization type
   */
  if (
    !organizationType ||
    !NGO_TYPES.includes(organizationType)
  ) {
    push(
      "organizationType",
      `Organization type must be one of: ${NGO_TYPES.join(", ")}`
    );
  }

  /*
   * Other organization type
   */
  if (
    organizationType === "OTHER" &&
    !minLen(
      specifiedOrganizationType,
      2
    )
  ) {
    push(
      "specifiedOrganizationType",
      "Please specify your organization type."
    );
  }

  if (!minLen(body.authorizedPerson, 2)) {
    push(
      "authorizedPerson",
      "Authorized person is required."
    );
  }

  if (!minLen(body.position, 2)) {
    push(
      "position",
      "Position is required."
    );
  }

  /*
   * NGO email is required
   */
  if (
    !email ||
    !EMAIL_REGEX.test(email)
  ) {
    push(
      "email",
      "A valid .com email address is required."
    );
  }
}

/*
 * ============================================================
 * VOLUNTEER VALIDATION
 * ============================================================
 */

function validateVolunteer(body, push) {
  const {
    vehicleType,
    vehicleNumber,
    email,
  } = body;

  /*
   * Full name
   */
  if (!minLen(body.fullName, 2)) {
    push(
      "fullName",
      "Full name must be at least 2 characters."
    );
  }

  /*
   * Email
   */
  if (
    !email ||
    !EMAIL_REGEX.test(email)
  ) {
    push(
      "email",
      "A valid .com email address is required."
    );
  }

  /*
   * Vehicle type
   */
  if (
    !vehicleType ||
    !VEHICLE_TYPES.includes(vehicleType)
  ) {
    push(
      "vehicleType",
      `Vehicle type must be one of: ${VEHICLE_TYPES.join(", ")}`
    );
  } else if (
    VEHICLE_TYPES_REQUIRING_NUMBER.includes(
      vehicleType
    ) &&
    !minLen(vehicleNumber, 1)
  ) {
    /*
     * Vehicle number is required for:
     * MOTORBIKE
     * THREE_WHEELER
     * CAR
     * VAN
     * OTHER
     */
    push(
      "vehicleNumber",
      "Vehicle number is required for this vehicle type."
    );
  }

  /*
   * Preferred delivery area
   */
  if (
    !minLen(
      body.preferredDeliveryArea,
      2
    )
  ) {
    push(
      "preferredDeliveryArea",
      "Preferred delivery area is required."
    );
  }

  /*
   * Availability
   */
  if (
    !["AVAILABLE", "UNAVAILABLE"].includes(
      body.availability
    )
  ) {
    push(
      "availability",
      "Availability must be AVAILABLE or UNAVAILABLE."
    );
  }
}

/*
 * ============================================================
 * EXPORT
 * ============================================================
 */

module.exports = validateRegistration;