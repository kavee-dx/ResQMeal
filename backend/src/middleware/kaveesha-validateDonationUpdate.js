// backend/src/middleware/kaveesha-validateDonationUpdate.js
// Validation for donation updates.
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
 * Validate donation update payload.
 *
 * Important:
 * Safety answers and AI screening are intentionally
 * NOT accepted here. They are locked after the
 * donation has been posted.
 */
function validateDonationUpdatePayload(req, res, next) {
  const errors = {};

  const {
    donationType,

    foodType,
    foodCategory,

    quantity,
    quantityUnit,
    numberOfPortions,

    preparationTime,
    expiryTime,

    availabilityStart,
    availabilityEnd,

    storageCondition,

    allergenInfo,
    packagingCondition,
    additionalDetails,

    pickupAddress,
    pickupDistrict,
    pickupWindowStart,
    pickupWindowEnd,
  } = req.body || {};

  /*
   * --------------------------------------------------
   * Donation type
   * --------------------------------------------------
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
   * Food information
   * --------------------------------------------------
   */

  if (
    foodType !== undefined
  ) {
    if (
      !String(foodType).trim()
    ) {
      errors.foodType =
        'Food type cannot be empty';
    } else if (
      String(foodType).trim().length > 120
    ) {
      errors.foodType =
        'Food type cannot exceed 120 characters';
    }
  }

  if (
    foodCategory !== undefined &&
    String(foodCategory).trim().length > 100
  ) {
    errors.foodCategory =
      'Food category cannot exceed 100 characters';
  }

  /*
   * --------------------------------------------------
   * Quantity
   * --------------------------------------------------
   */

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

  /*
   * --------------------------------------------------
   * Quantity unit
   * --------------------------------------------------
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
   * --------------------------------------------------
   * Number of portions
   * --------------------------------------------------
   */

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
    } else if (
      !Number.isInteger(
        numericPortions,
      )
    ) {
      errors.numberOfPortions =
        'Number of portions must be a whole number';
    }
  }

  /*
   * --------------------------------------------------
   * Preparation time
   * --------------------------------------------------
   */

  if (
    preparationTime !== undefined
  ) {
    if (
      !isValidDate(
        preparationTime,
      )
    ) {
      errors.preparationTime =
        'A valid preparation date and time is required';
    }
  }

  /*
   * --------------------------------------------------
   * Expiry time
   * --------------------------------------------------
   */

  if (
    expiryTime !== undefined
  ) {
    if (
      !isValidDate(
        expiryTime,
      )
    ) {
      errors.expiryTime =
        'A valid expiry date and time is required';
    }
  }

  /*
   * Compare preparation and expiry when both
   * are included in the same update request.
   */
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
   * Availability
   * --------------------------------------------------
   */

  if (
    availabilityStart !== undefined
  ) {
    if (
      !isValidDate(
        availabilityStart,
      )
    ) {
      errors.availabilityStart =
        'A valid availability start is required';
    }
  }

  if (
    availabilityEnd !== undefined
  ) {
    if (
      !isValidDate(
        availabilityEnd,
      )
    ) {
      errors.availabilityEnd =
        'A valid availability end is required';
    }
  }

  /*
   * Compare availability dates when both are
   * included in the same request.
   */
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
   * If expiry is also supplied, availability must
   * finish before or at expiry.
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
   *
   * Note:
   * This field is currently validated because it is
   * part of the donation information.
   *
   * The update route can later lock it completely
   * if the final product rules require that.
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
   * Food information text fields
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
   * Pickup location
   * --------------------------------------------------
   */

  if (
    pickupAddress !== undefined
  ) {
    if (
      !String(pickupAddress).trim()
    ) {
      errors.pickupAddress =
        'Pickup address cannot be empty';
    } else if (
      String(pickupAddress).trim().length > 300
    ) {
      errors.pickupAddress =
        'Pickup address cannot exceed 300 characters';
    }
  }

  if (
    pickupDistrict !== undefined
  ) {
    if (
      !String(pickupDistrict).trim()
    ) {
      errors.pickupDistrict =
        'Pickup district cannot be empty';
    } else if (
      String(pickupDistrict).trim().length > 100
    ) {
      errors.pickupDistrict =
        'Pickup district cannot exceed 100 characters';
    }
  }

  /*
   * --------------------------------------------------
   * Pickup window
   * --------------------------------------------------
   */

  if (
    pickupWindowStart !== undefined
  ) {
    if (
      !isValidDate(
        pickupWindowStart,
      )
    ) {
      errors.pickupWindowStart =
        'A valid pickup start date and time is required';
    }
  }

  if (
    pickupWindowEnd !== undefined
  ) {
    if (
      !isValidDate(
        pickupWindowEnd,
      )
    ) {
      errors.pickupWindowEnd =
        'A valid pickup end date and time is required';
    }
  }

  /*
   * Compare pickup start/end when both are
   * included in the same request.
   */
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
   * Pickup must remain within the availability
   * window when those values are supplied.
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
   * Pickup cannot finish after food expiry.
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
   * Safety / AI protection
   * --------------------------------------------------
   *
   * These are deliberately rejected during updates.
   *
   * A donor cannot change a completed safety assessment
   * or AI screening result after posting.
   */

  if (
    req.body &&
    Object.prototype.hasOwnProperty.call(
      req.body,
      'safety',
    )
  ) {
    errors.safety =
      'Safety assessment cannot be changed after the donation is posted';
  }

  if (
    req.body &&
    Object.prototype.hasOwnProperty.call(
      req.body,
      'aiResult',
    )
  ) {
    errors.aiResult =
      'AI screening result cannot be changed through donation editing';
  }

  if (
    req.body &&
    Object.prototype.hasOwnProperty.call(
      req.body,
      'aiReason',
    )
  ) {
    errors.aiReason =
      'AI screening information cannot be changed through donation editing';
  }

  /*
   * --------------------------------------------------
   * Final result
   * --------------------------------------------------
   */

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