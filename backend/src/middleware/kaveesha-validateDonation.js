function validateDonationPayload(req, res, next) {
  const errors = {};
  const {
    foodType,
    quantity,
    numberOfPortions,
    preparationTime,
    expiryTime,
  } = req.body;

  if (!foodType || !foodType.trim()) {
    errors.foodType = 'Food type is required';
  }

  if (quantity === undefined || quantity === null || Number(quantity) <= 0) {
    errors.quantity = 'Quantity must be a positive number';
  }

  if (
    numberOfPortions === undefined ||
    numberOfPortions === null ||
    Number(numberOfPortions) <= 0
  ) {
    errors.numberOfPortions = 'Number of portions must be a positive number';
  }

  if (!preparationTime || isNaN(Date.parse(preparationTime))) {
    errors.preparationTime = 'A valid preparation time is required';
  }

  if (!expiryTime || isNaN(Date.parse(expiryTime))) {
    errors.expiryTime = 'A valid expiry time is required';
  } else if (
    preparationTime &&
    !isNaN(Date.parse(preparationTime)) &&
    new Date(expiryTime) <= new Date(preparationTime)
  ) {
    errors.expiryTime = 'Expiry time must be after preparation time';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

module.exports = { validateDonationPayload };