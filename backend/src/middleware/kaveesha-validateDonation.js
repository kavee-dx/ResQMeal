// backend/src/middleware/kaveesha-validateDonation.js
// Validation for creating donations.
// Owner: Kaveesha

const VALID_QUANTITY_UNITS = [
  'kg',
  'g',
  'L',
  'mL',
  'items',
  'boxes',
  'trays',
  'packs',
  'other',
];

const VALID_DONATION_TYPES = [
  'NORMAL',
  'URGENT',
];

const VALID_STORAGE_CONDITIONS = [
  'Refrigerated',
  'Frozen',
  'Room Temperature',
  'Other',
];

const VALID_AI_RESULTS = [
  'PENDING',
  'GOOD',
  'REVIEW',
  'CONCERN',
];

const VALID_SAFETY_YES_NO = [
  'YES',
  'NO',
];

const VALID_SAFETY_YES_NO_UNSURE = [
  'YES',
  'NO',
  'NOT_SURE',
];

/**
 * Check whether a value is a valid date.
 */
function isValidDate(value) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

/**
 * Check whether a value is a valid positive number.
 */
function isPositiveNumber(value) {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number > 0
  );
}

/**
 * Validate the safety checklist.
 *
 * Required questions:
 * - storage
 * - temperature
 * - handling
 * - packaging
 * - allergens
 *
 * Blocking answers:
 * - storage = NO
 * - handling = NO
 * - packaging = NO
 *
 * NOT_SURE is allowed for temperature/allergens,
 * but it is preserved and surfaced to the user.
 */
function validateSafety(safety, errors) {
  if (
    !safety ||
    typeof safety !== 'object' ||
    Array.isArray(safety)
  ) {
    errors.safety =
      'Safety assessment is required';

    return;
  }

  const {
    storage,
    temperature,
    handling,
    packaging,
    allergens,
  } = safety;

  /*
   * All five safety questions must be answered.
   */
  if (!VALID_SAFETY_YES_NO.includes(storage)) {
    errors['safety.storage'] =
      'Storage safety answer is required';
  }

  if (
    !VALID_SAFETY_YES_NO_UNSURE.includes(
      temperature,
    )
  ) {
    errors['safety.temperature'] =
      'Temperature safety answer is required';
  }

  if (!VALID_SAFETY_YES_NO.includes(handling)) {
    errors['safety.handling'] =
      'Handling safety answer is required';
  }

  if (!VALID_SAFETY_YES_NO.includes(packaging)) {
    errors['safety.packaging'] =
      'Packaging safety answer is required';
  }

  if (
    !VALID_SAFETY_YES_NO_UNSURE.includes(
      allergens,
    )
  ) {
    errors['safety.allergens'] =
      'Allergen safety answer is required';
  }

  /*
   * Blocking safety concerns.
   *
   * These must never be allowed to reach the
   * database as a published donation.
   */
  if (storage === 'NO') {
    errors.safety =
      'Donation cannot be posted because the food was not reported as stored appropriately';
  }

  if (handling === 'NO') {
    errors.safety =
      'Donation cannot be posted because the food was not reported as handled hygienically';
  }

  if (packaging === 'NO') {
    errors.safety =
      'Donation cannot be posted because the food container was not reported as clean and intact';
  }
}

/**
 * Validate donation creation payload.
 */
function validateDonationPayload(req, res, next) {
  const errors = {};

  const {
    foodType,
    foodCategory,

    quantity,
    numberOfPortions,

    preparationTime,
    expiryTime,

    availabilityStart,
    availabilityEnd,

    storageCondition,
    quantityUnit,
    donationType,

    allergenInfo,
    packagingCondition,
    additionalDetails,

    pickupAddress,
    pickupDistrict,
    pickupWindowStart,
    pickupWindowEnd,

    aiResult,
    aiReason,

    safety,
  } = req.body || {};

  /*
   * --------------------------------------------------
   * Food information
   * --------------------------------------------------
   */

  if (
    !foodType ||
    !String(foodType).trim()
  ) {
    errors.foodType =
      'Food type is required';
  } else if (
    String(foodType).trim().length > 120
  ) {
    errors.foodType =
      'Food type cannot exceed 120 characters';
  }

  if (
    foodCategory !== undefined &&
    String(foodCategory).trim().length > 100
  ) {
    errors.foodCategory =
      'Food category cannot exceed 100 characters';
  }

  /*
   * Quantity
   */
  if (!isPositiveNumber(quantity)) {
    errors.quantity =
      'Quantity must be a positive number';
  }

  /*
   * Portions
   */
  if (!isPositiveNumber(numberOfPortions)) {
    errors.numberOfPortions =
      'Number of portions must be a positive number';
  } else if (
    !Number.isInteger(Number(numberOfPortions))
  ) {
    errors.numberOfPortions =
      'Number of portions must be a whole number';
  }

  /*
   * Quantity unit
   */
  if (
    quantityUnit !== undefined &&
    !VALID_QUANTITY_UNITS.includes(
      quantityUnit,
    )
  ) {
    errors.quantityUnit =
      'Invalid quantity unit';
  }

  /*
   * Donation type
   */
  if (
    donationType !== undefined &&
    !VALID_DONATION_TYPES.includes(
      donationType,
    )
  ) {
    errors.donationType =
      'Invalid donation type';
  }

  /*
   * --------------------------------------------------
   * Food timing
   * --------------------------------------------------
   */

  if (!isValidDate(preparationTime)) {
    errors.preparationTime =
      'A valid preparation date and time is required';
  }

  if (!isValidDate(expiryTime)) {
    errors.expiryTime =
      'A valid expiry date and time is required';
  }

  if (
    isValidDate(preparationTime) &&
    isValidDate(expiryTime) &&
    new Date(expiryTime) <=
      new Date(preparationTime)
  ) {
    errors.expiryTime =
      'Expiry time must be after preparation time';
  }

  /*
   * --------------------------------------------------
   * Donation availability
   * --------------------------------------------------
   */

  if (!isValidDate(availabilityStart)) {
    errors.availabilityStart =
      'A valid availability start is required';
  }

  if (!isValidDate(availabilityEnd)) {
    errors.availabilityEnd =
      'A valid availability end is required';
  }

  if (
    isValidDate(availabilityStart) &&
    isValidDate(availabilityEnd) &&
    new Date(availabilityEnd) <=
      new Date(availabilityStart)
  ) {
    errors.availabilityEnd =
      'Availability end must be after availability start';
  }

  /*
   * Availability should not finish after expiry.
   */
  if (
    isValidDate(availabilityEnd) &&
    isValidDate(expiryTime) &&
    new Date(availabilityEnd) >
      new Date(expiryTime)
  ) {
    errors.availabilityEnd =
      'Availability end cannot be after the food expiry time';
  }

  /*
   * --------------------------------------------------
   * Storage
   * --------------------------------------------------
   */

  if (
    storageCondition !== undefined &&
    !VALID_STORAGE_CONDITIONS.includes(
      storageCondition,
    )
  ) {
    errors.storageCondition =
      'Invalid storage condition';
  }

  /*
   * --------------------------------------------------
   * Pickup information
   * --------------------------------------------------
   */

  if (
    !pickupAddress ||
    !String(pickupAddress).trim()
  ) {
    errors.pickupAddress =
      'Pickup address is required';
  } else if (
    String(pickupAddress).trim().length > 300
  ) {
    errors.pickupAddress =
      'Pickup address cannot exceed 300 characters';
  }

  if (
    !pickupDistrict ||
    !String(pickupDistrict).trim()
  ) {
    errors.pickupDistrict =
      'Pickup district is required';
  } else if (
    String(pickupDistrict).trim().length > 100
  ) {
    errors.pickupDistrict =
      'Pickup district cannot exceed 100 characters';
  }

  /*
   * Pickup window is required.
   */
  if (!isValidDate(pickupWindowStart)) {
    errors.pickupWindowStart =
      'A valid pickup start date and time is required';
  }

  if (!isValidDate(pickupWindowEnd)) {
    errors.pickupWindowEnd =
      'A valid pickup end date and time is required';
  }

  if (
    isValidDate(pickupWindowStart) &&
    isValidDate(pickupWindowEnd) &&
    new Date(pickupWindowEnd) <=
      new Date(pickupWindowStart)
  ) {
    errors.pickupWindowEnd =
      'Pickup end must be after pickup start';
  }

  /*
   * Pickup should be within the donation availability
   * window.
   */
  if (
    isValidDate(pickupWindowStart) &&
    isValidDate(availabilityStart) &&
    new Date(pickupWindowStart) <
      new Date(availabilityStart)
  ) {
    errors.pickupWindowStart =
      'Pickup start cannot be before donation availability starts';
  }

  if (
    isValidDate(pickupWindowEnd) &&
    isValidDate(availabilityEnd) &&
    new Date(pickupWindowEnd) >
      new Date(availabilityEnd)
  ) {
    errors.pickupWindowEnd =
      'Pickup end cannot be after donation availability ends';
  }

  /*
   * Pickup must also finish before food expiry.
   */
  if (
    isValidDate(pickupWindowEnd) &&
    isValidDate(expiryTime) &&
    new Date(pickupWindowEnd) >
      new Date(expiryTime)
  ) {
    errors.pickupWindowEnd =
      'Pickup end cannot be after the food expiry time';
  }

  /*
   * --------------------------------------------------
   * Optional text fields
   * --------------------------------------------------
   */

  if (
    allergenInfo !== undefined &&
    String(allergenInfo).length > 300
  ) {
    errors.allergenInfo =
      'Allergen information cannot exceed 300 characters';
  }

  if (
    packagingCondition !== undefined &&
    String(packagingCondition).length > 200
  ) {
    errors.packagingCondition =
      'Packaging condition cannot exceed 200 characters';
  }

  if (
    additionalDetails !== undefined &&
    String(additionalDetails).length > 1000
  ) {
    errors.additionalDetails =
      'Additional details cannot exceed 1000 characters';
  }

  /*
   * --------------------------------------------------
   * AI visual screening
   * --------------------------------------------------
   */

  if (
    aiResult !== undefined &&
    !VALID_AI_RESULTS.includes(aiResult)
  ) {
    errors.aiResult =
      'Invalid AI screening result';
  }

  if (
    aiReason !== undefined &&
    String(aiReason).length > 500
  ) {
    errors.aiReason =
      'AI screening reason cannot exceed 500 characters';
  }

  /*
   * --------------------------------------------------
   * Safety assessment
   * --------------------------------------------------
   */

  validateSafety(safety, errors);

  /*
   * --------------------------------------------------
   * Final result
   * --------------------------------------------------
   */

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

module.exports = {
  validateDonationPayload,
};