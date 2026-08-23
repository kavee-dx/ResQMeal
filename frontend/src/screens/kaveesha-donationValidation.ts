import { DonationFormValues, DonationFormErrors } from '@/types/kaveesha-donation.types';

export function validateDonationForm(values: DonationFormValues): DonationFormErrors {
  const errors: DonationFormErrors = {};

  if (!values.foodType.trim()) {
    errors.foodType = 'Food type is required';
  }

  if (!values.quantity.trim()) {
    errors.quantity = 'Quantity is required';
  } else if (isNaN(Number(values.quantity)) || Number(values.quantity) <= 0) {
    errors.quantity = 'Quantity must be a positive number';
  }

  if (!values.numberOfPortions.trim()) {
    errors.numberOfPortions = 'Number of portions is required';
  } else if (isNaN(Number(values.numberOfPortions)) || Number(values.numberOfPortions) <= 0) {
    errors.numberOfPortions = 'Number of portions must be a positive number';
  }

  if (!values.preparationTime.trim()) {
    errors.preparationTime = 'Preparation time is required';
  }

  if (!values.expiryTime.trim()) {
    errors.expiryTime = 'Expiry time is required';
  } else if (values.preparationTime.trim()) {
    const prep = new Date(values.preparationTime);
    const expiry = new Date(values.expiryTime);
    if (!isNaN(prep.getTime()) && !isNaN(expiry.getTime()) && expiry <= prep) {
      errors.expiryTime = 'Expiry time must be after preparation time';
    }
  }

  return errors;
}

export function isFormValid(errors: DonationFormErrors): boolean {
  return Object.keys(errors).length === 0;
}

