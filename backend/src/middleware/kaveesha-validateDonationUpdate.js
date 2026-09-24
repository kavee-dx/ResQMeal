// backend/src/middleware/kaveesha-validateDonationUpdate.js
// Validation for donation updates.
// Owner: Kaveesha

function validateDonationUpdatePayload(
  req,
  res,
  next,
) {
  const errors = {};

  const {
    foodType,
    quantity,
    numberOfPortions,
    preparationTime,
    expiryTime,
    availabilityStart,
    availabilityEnd,
    quantityUnit,
    storageCondition,
    donationType,
  } = req.body;

  if (
    foodType !== undefined &&
    !String(foodType).trim()
  ) {
    errors.foodType =
      'Food type cannot be empty';
  }

  if (quantity !== undefined) {
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
  }

  if (
    numberOfPortions !== undefined
  ) {
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
    preparationTime !== undefined
  ) {
    if (
      Number.isNaN(
        Date.parse(
          preparationTime,
        ),
      )
    ) {
      errors.preparationTime =
        'A valid preparation time is required';
    }
  }

  if (expiryTime !== undefined) {
    if (
      Number.isNaN(
        Date.parse(expiryTime),
      )
    ) {
      errors.expiryTime =
        'A valid expiry time is required';
    } else if (
      preparationTime !==
        undefined &&
      !Number.isNaN(
        Date.parse(
          preparationTime,
        ),
      ) &&
      new Date(expiryTime) <=
        new Date(preparationTime)
    ) {
      errors.expiryTime =
        'Expiry time must be after preparation time';
    }
  }

  if (
    availabilityStart !==
      undefined &&
    Number.isNaN(
      Date.parse(
        availabilityStart,
      ),
    )
  ) {
    errors.availabilityStart =
      'A valid availability start is required';
  }

  if (
    availabilityEnd !==
      undefined &&
    Number.isNaN(
      Date.parse(
        availabilityEnd,
      ),
    )
  ) {
    errors.availabilityEnd =
      'A valid availability end is required';
  }

  if (
    availabilityStart !==
      undefined &&
    availabilityEnd !==
      undefined &&
    !Number.isNaN(
      Date.parse(
        availabilityStart,
      ),
    ) &&
    !Number.isNaN(
      Date.parse(
        availabilityEnd,
      ),
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
    storageCondition !==
      undefined &&
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
  validateDonationUpdatePayload,
};