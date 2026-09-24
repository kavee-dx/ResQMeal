// backend/src/middleware/kaveesha-validateDonation.js
// Validation for creating donations.
// Owner: Kaveesha

function validateDonationPayload(req, res, next) {
  const errors = {};

  const {
    foodType,
    quantity,
    numberOfPortions,
    preparationTime,
    expiryTime,
    availabilityStart,
    availabilityEnd,
    storageCondition,
    quantityUnit,
    donationType,
  } = req.body;

  if (
    !foodType ||
    !String(foodType).trim()
  ) {
    errors.foodType =
      'Food type is required';
  }

  const numericQuantity =
    Number(quantity);

  if (
    !Number.isFinite(
      numericQuantity,
    ) ||
    numericQuantity <= 0
  ) {
    errors.quantity =
      'Quantity must be a positive number';
  }

  const numericPortions =
    Number(numberOfPortions);

  if (
    !Number.isFinite(
      numericPortions,
    ) ||
    numericPortions <= 0
  ) {
    errors.numberOfPortions =
      'Number of portions must be a positive number';
  }

  if (
    quantityUnit !== undefined &&
    ![
      'kg',
      'g',
      'L',
      'mL',
      'items',
      'boxes',
      'trays',
      'packs',
      'other',
    ].includes(quantityUnit)
  ) {
    errors.quantityUnit =
      'Invalid quantity unit';
  }

  if (
    donationType !== undefined &&
    !['NORMAL', 'URGENT'].includes(
      donationType,
    )
  ) {
    errors.donationType =
      'Invalid donation type';
  }

  if (
    !preparationTime ||
    Number.isNaN(
      Date.parse(preparationTime),
    )
  ) {
    errors.preparationTime =
      'A valid preparation time is required';
  }

  if (
    !expiryTime ||
    Number.isNaN(
      Date.parse(expiryTime),
    )
  ) {
    errors.expiryTime =
      'A valid expiry time is required';
  } else if (
    preparationTime &&
    !Number.isNaN(
      Date.parse(preparationTime),
    ) &&
    new Date(expiryTime) <=
      new Date(preparationTime)
  ) {
    errors.expiryTime =
      'Expiry time must be after preparation time';
  }

  if (
    availabilityStart &&
    Number.isNaN(
      Date.parse(availabilityStart),
    )
  ) {
    errors.availabilityStart =
      'A valid availability start is required';
  }

  if (
    availabilityEnd &&
    Number.isNaN(
      Date.parse(availabilityEnd),
    )
  ) {
    errors.availabilityEnd =
      'A valid availability end is required';
  }

  if (
    availabilityStart &&
    availabilityEnd &&
    !Number.isNaN(
      Date.parse(availabilityStart),
    ) &&
    !Number.isNaN(
      Date.parse(availabilityEnd),
    ) &&
    new Date(availabilityEnd) <=
      new Date(availabilityStart)
  ) {
    errors.availabilityEnd =
      'Availability end must be after availability start';
  }

  const validStorageConditions = [
    'Refrigerated',
    'Frozen',
    'Room Temperature',
    'Other',
  ];

  if (
    storageCondition !== undefined &&
    !validStorageConditions.includes(
      storageCondition,
    )
  ) {
    errors.storageCondition =
      'Invalid storage condition';
  }

  if (
    Object.keys(errors).length > 0
  ) {
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