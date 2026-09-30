// frontend/src/screens/kaveesha-donationValidation.ts
// Owner: Kaveesha

import type {
  DonationFormValues,
  DonationFormErrors,
} from '@/types/kaveesha-donation.types';

/**
 * Validate YYYY-MM-DD format and make sure it is a real calendar date.
 */
function isValidDate(value: string): boolean {
  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }

  const [year, month, day] = trimmed
    .split('-')
    .map(Number);

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Convert a time such as:
 *
 * 5:30 PM
 * 10:00 AM
 * 17:30
 *
 * into minutes after midnight.
 */
function parseTime(time: string): number | null {
  const value = time.trim().toUpperCase();

  const match = value.match(
    /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/,
  );

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  if (minutes < 0 || minutes > 59) {
    return null;
  }

  if (period) {
    if (hours < 1 || hours > 12) {
      return null;
    }

    if (period === 'AM') {
      if (hours === 12) {
        hours = 0;
      }
    } else {
      if (hours !== 12) {
        hours += 12;
      }
    }
  } else {
    if (hours < 0 || hours > 23) {
      return null;
    }
  }

  return hours * 60 + minutes;
}

/**
 * Combine a date and time into a local timestamp.
 *
 * Used only for comparison during validation.
 */
function parseDateTime(
  dateValue: string,
  timeValue: string,
): number | null {
  if (!isValidDate(dateValue)) {
    return null;
  }

  const minutes = parseTime(timeValue);

  if (minutes === null) {
    return null;
  }

  const [year, month, day] = dateValue
    .split('-')
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day,
    0,
    0,
    0,
    0,
  );

  date.setMinutes(minutes);

  return date.getTime();
}

export function validateDonationForm(
  values: DonationFormValues,
): DonationFormErrors {
  const errors: DonationFormErrors = {};

  /*
   * ---------------------------------------------------------
   * Donation type
   * ---------------------------------------------------------
   */

  if (
    values.donationType !== 'NORMAL' &&
    values.donationType !== 'URGENT'
  ) {
    errors.donationType = 'Please select a donation type';
  }

  /*
   * ---------------------------------------------------------
   * Food information
   * ---------------------------------------------------------
   */

  if (!values.foodType?.trim()) {
    errors.foodType = 'Food type is required';
  } else if (values.foodType.trim().length < 2) {
    errors.foodType =
      'Food type must contain at least 2 characters';
  } else if (values.foodType.trim().length > 100) {
    errors.foodType =
      'Food type cannot exceed 100 characters';
  }

  if (!values.category?.trim()) {
    errors.category = 'Food category is required';
  }

  if (!values.quantity?.trim()) {
    errors.quantity = 'Quantity is required';
  } else {
    const quantity = Number(values.quantity);

    if (!Number.isFinite(quantity)) {
      errors.quantity =
        'Quantity must be a valid number';
    } else if (quantity <= 0) {
      errors.quantity =
        'Quantity must be greater than 0';
    }
  }

  if (!values.portions?.trim()) {
    errors.portions =
      'Number of portions is required';
  } else {
    const portions = Number(values.portions);

    if (!Number.isFinite(portions)) {
      errors.portions =
        'Number of portions must be a valid number';
    } else if (portions <= 0) {
      errors.portions =
        'Number of portions must be greater than 0';
    } else if (!Number.isInteger(portions)) {
      errors.portions =
        'Number of portions must be a whole number';
    }
  }

  /*
   * ---------------------------------------------------------
   * Preparation
   * ---------------------------------------------------------
   */

  if (!values.preparationDate?.trim()) {
    errors.preparationDate =
      'Preparation date is required';
  } else if (!isValidDate(values.preparationDate)) {
    errors.preparationDate =
      'Use the format YYYY-MM-DD';
  }

  if (!values.preparationTime?.trim()) {
    errors.preparationTime =
      'Preparation time is required';
  } else if (
    parseTime(values.preparationTime) === null
  ) {
    errors.preparationTime =
      'Enter a valid time, e.g. 10:00 AM';
  }

  /*
   * ---------------------------------------------------------
   * Expiry
   * ---------------------------------------------------------
   */

  if (!values.expiryDate?.trim()) {
    errors.expiryDate =
      'Expiry date is required';
  } else if (!isValidDate(values.expiryDate)) {
    errors.expiryDate =
      'Use the format YYYY-MM-DD';
  }

  if (!values.expiryTime?.trim()) {
    errors.expiryTime =
      'Expiry time is required';
  } else if (
    parseTime(values.expiryTime) === null
  ) {
    errors.expiryTime =
      'Enter a valid time, e.g. 8:00 PM';
  }

  const preparationTimestamp =
    parseDateTime(
      values.preparationDate,
      values.preparationTime,
    );

  const expiryTimestamp =
    parseDateTime(
      values.expiryDate,
      values.expiryTime,
    );

  if (
    preparationTimestamp !== null &&
    expiryTimestamp !== null &&
    expiryTimestamp <= preparationTimestamp
  ) {
    errors.expiryDate =
      'Expiry must be after preparation date and time';
  }

  /*
   * ---------------------------------------------------------
   * Pickup information
   * ---------------------------------------------------------
   */

  if (!values.pickupLocation?.trim()) {
    errors.pickupLocation =
      'Pickup address is required';
  } else if (
    values.pickupLocation.trim().length < 5
  ) {
    errors.pickupLocation =
      'Please provide a more complete pickup address';
  }

  if (!values.pickupDistrict?.trim()) {
    errors.pickupDistrict =
      'Pickup district is required';
  } else if (
    values.pickupDistrict.trim().length < 2
  ) {
    errors.pickupDistrict =
      'Please enter a valid district';
  }

  /*
   * Pickup start
   */

  if (!values.pickupAvailableFromDate?.trim()) {
    errors.pickupAvailableFromDate =
      'Pickup start date is required';
  } else if (
    !isValidDate(values.pickupAvailableFromDate)
  ) {
    errors.pickupAvailableFromDate =
      'Use the format YYYY-MM-DD';
  }

  if (!values.pickupAvailableFromTime?.trim()) {
    errors.pickupAvailableFromTime =
      'Pickup start time is required';
  } else if (
    parseTime(values.pickupAvailableFromTime) === null
  ) {
    errors.pickupAvailableFromTime =
      'Enter a valid time, e.g. 5:00 PM';
  }

  /*
   * Pickup end
   */

  if (!values.pickupAvailableUntilDate?.trim()) {
    errors.pickupAvailableUntilDate =
      'Pickup end date is required';
  } else if (
    !isValidDate(values.pickupAvailableUntilDate)
  ) {
    errors.pickupAvailableUntilDate =
      'Use the format YYYY-MM-DD';
  }

  if (!values.pickupAvailableUntilTime?.trim()) {
    errors.pickupAvailableUntilTime =
      'Pickup end time is required';
  } else if (
    parseTime(values.pickupAvailableUntilTime) === null
  ) {
    errors.pickupAvailableUntilTime =
      'Enter a valid time, e.g. 8:00 PM';
  }

  const pickupStartTimestamp =
    parseDateTime(
      values.pickupAvailableFromDate,
      values.pickupAvailableFromTime,
    );

  const pickupEndTimestamp =
    parseDateTime(
      values.pickupAvailableUntilDate,
      values.pickupAvailableUntilTime,
    );

  if (
    pickupStartTimestamp !== null &&
    pickupEndTimestamp !== null &&
    pickupEndTimestamp <= pickupStartTimestamp
  ) {
    errors.pickupAvailableUntilDate =
      'Pickup end must be after pickup start';
  }

  /*
   * ---------------------------------------------------------
   * Additional details
   * ---------------------------------------------------------
   */

  if (
    values.additionalDetails &&
    values.additionalDetails.trim().length > 500
  ) {
    errors.additionalDetails =
      'Additional details cannot exceed 500 characters';
  }

  return errors;
}

export function isFormValid(
  errors: DonationFormErrors,
): boolean {
  return Object.keys(errors).length === 0;
}