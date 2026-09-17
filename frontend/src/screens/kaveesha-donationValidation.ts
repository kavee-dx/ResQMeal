import {
  DonationFormValues,
  DonationFormErrors,
} from '@/types/kaveesha-donation.types';

const VALID_STORAGE_CONDITIONS = [
  'Refrigerated',
  'Frozen',
  'Room Temperature',
  'Other',
];

export function validateDonationForm(
  values: DonationFormValues
): DonationFormErrors {
  const errors: DonationFormErrors = {};

  // =========================================================
  // Food Information
  // =========================================================

  if (!values.foodType?.trim()) {
    errors.foodType = 'Food type is required';
  } else if (values.foodType.trim().length < 2) {
    errors.foodType = 'Food type must contain at least 2 characters';
  }

  if (!values.foodCategory?.trim()) {
    errors.foodCategory = 'Food category is required';
  }

  // =========================================================
  // Quantity
  // =========================================================

  if (!values.quantity?.trim()) {
    errors.quantity = 'Quantity is required';
  } else {
    const quantity = Number(values.quantity);

    if (!Number.isFinite(quantity)) {
      errors.quantity = 'Quantity must be a valid number';
    } else if (quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
  }

  // =========================================================
  // Number of Portions
  // =========================================================

  if (!values.numberOfPortions?.trim()) {
    errors.numberOfPortions = 'Number of portions is required';
  } else {
    const portions = Number(values.numberOfPortions);

    if (!Number.isFinite(portions)) {
      errors.numberOfPortions =
        'Number of portions must be a valid number';
    } else if (portions <= 0) {
      errors.numberOfPortions =
        'Number of portions must be greater than 0';
    } else if (!Number.isInteger(portions)) {
      errors.numberOfPortions =
        'Number of portions must be a whole number';
    }
  }

  // =========================================================
  // Preparation Time
  // =========================================================

  if (!values.preparationTime?.trim()) {
    errors.preparationTime = 'Preparation time is required';
  } else {
    const preparationDate = new Date(values.preparationTime);

    if (Number.isNaN(preparationDate.getTime())) {
      errors.preparationTime =
        'Please enter a valid preparation date and time';
    }
  }

  // =========================================================
  // Expiry Time
  // =========================================================

  if (!values.expiryTime?.trim()) {
    errors.expiryTime = 'Expiry time is required';
  } else {
    const expiryDate = new Date(values.expiryTime);

    if (Number.isNaN(expiryDate.getTime())) {
      errors.expiryTime =
        'Please enter a valid expiry date and time';
    }

    if (values.preparationTime?.trim()) {
      const preparationDate = new Date(values.preparationTime);

      if (
        !Number.isNaN(preparationDate.getTime()) &&
        !Number.isNaN(expiryDate.getTime()) &&
        expiryDate <= preparationDate
      ) {
        errors.expiryTime =
          'Expiry time must be after preparation time';
      }
    }
  }

  // =========================================================
  // Storage Condition
  // =========================================================

  if (!values.storageCondition?.trim()) {
    errors.storageCondition = 'Storage condition is required';
  } else if (
    !VALID_STORAGE_CONDITIONS.includes(values.storageCondition)
  ) {
    errors.storageCondition =
      'Please select a valid storage condition';
  }

  // =========================================================
  // Allergen Information
  // =========================================================

  if (!values.allergenInfo?.trim()) {
    errors.allergenInfo =
      'Please provide allergen information or enter "None"';
  } else if (values.allergenInfo.trim().length > 200) {
    errors.allergenInfo =
      'Allergen information cannot exceed 200 characters';
  }

  // =========================================================
  // Packaging Condition
  // =========================================================

  if (!values.packagingCondition?.trim()) {
    errors.packagingCondition =
      'Packaging condition is required';
  } else if (values.packagingCondition.trim().length < 3) {
    errors.packagingCondition =
      'Please provide a valid packaging condition';
  }

  // =========================================================
  // Pickup Address
  // =========================================================

  if (!values.pickupAddress?.trim()) {
    errors.pickupAddress = 'Pickup address is required';
  } else if (values.pickupAddress.trim().length < 5) {
    errors.pickupAddress =
      'Please provide a more complete pickup address';
  }

  // =========================================================
  // Pickup District
  // =========================================================

  if (!values.pickupDistrict?.trim()) {
    errors.pickupDistrict = 'Pickup district is required';
  } else if (values.pickupDistrict.trim().length < 2) {
    errors.pickupDistrict = 'Please enter a valid district';
  }

  // =========================================================
  // Pickup Window Start
  // =========================================================

  if (!values.pickupWindowStart?.trim()) {
    errors.pickupWindowStart =
      'Pickup start time is required';
  }

  // =========================================================
  // Pickup Window End
  // =========================================================

  if (!values.pickupWindowEnd?.trim()) {
    errors.pickupWindowEnd =
      'Pickup end time is required';
  }

  // =========================================================
  // Pickup Time Validation
  // =========================================================

  if (
    values.pickupWindowStart?.trim() &&
    values.pickupWindowEnd?.trim()
  ) {
    const startTime = parseTime(values.pickupWindowStart);
    const endTime = parseTime(values.pickupWindowEnd);

    if (startTime === null) {
      errors.pickupWindowStart =
        'Please enter a valid time, e.g. 5:30 PM';
    }

    if (endTime === null) {
      errors.pickupWindowEnd =
        'Please enter a valid time, e.g. 6:00 PM';
    }

    if (
      startTime !== null &&
      endTime !== null &&
      endTime <= startTime
    ) {
      errors.pickupWindowEnd =
        'Pickup end time must be after start time';
    }
  }

  return errors;
}

// =========================================================
// Helper: Convert pickup time to minutes
// =========================================================

function parseTime(time: string): number | null {
  const value = time.trim().toUpperCase();

  /*
   * Supported:
   *
   * 5:30 PM
   * 05:30 PM
   * 17:30
   * 5:30
   */

  const match = value.match(
    /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/
  );

  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3];

  // Validate minutes
  if (minutes < 0 || minutes > 59) {
    return null;
  }

  // 12-hour format
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
  }

  // 24-hour format
  else {
    if (hours < 0 || hours > 23) {
      return null;
    }
  }

  return hours * 60 + minutes;
}

// =========================================================
// Check whether form has no validation errors
// =========================================================

export function isFormValid(
  errors: DonationFormErrors
): boolean {
  return Object.keys(errors).length === 0;
}