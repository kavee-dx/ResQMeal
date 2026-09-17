function validateDonationUpdatePayload(req, res, next) {
  const errors = {};
  const { quantity, numberOfPortions, preparationTime, expiryTime, foodType } = req.body;

  if (foodType !== undefined && !String(foodType).trim()) {
    errors.foodType = 'Food type cannot be empty';
  }

  if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) <= 0)) {
    errors.quantity = 'Quantity must be a positive number';
  }

  if (
    numberOfPortions !== undefined &&
    (isNaN(Number(numberOfPortions)) || Number(numberOfPortions) <= 0)
  ) {
    errors.numberOfPortions = 'Number of portions must be a positive number';
  }

  if (preparationTime !== undefined && isNaN(Date.parse(preparationTime))) {
    errors.preparationTime = 'A valid preparation time is required';
  }

  if (expiryTime !== undefined) {
    if (isNaN(Date.parse(expiryTime))) {
      errors.expiryTime = 'A valid expiry time is required';
    } else if (
      preparationTime !== undefined &&
      !isNaN(Date.parse(preparationTime)) &&
      new Date(expiryTime) <= new Date(preparationTime)
    ) {
      errors.expiryTime = 'Expiry time must be after preparation time';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
}

module.exports = { validateDonationUpdatePayload };