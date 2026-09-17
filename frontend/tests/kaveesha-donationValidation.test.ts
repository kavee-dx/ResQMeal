/**
 * kaveesha-donationValidation.test.ts
 * Location: frontend/tests/kaveesha-donationValidation.test.ts
 */

import {
  validateDonationForm,
  isFormValid,
} from '../src/screens/kaveesha-donationValidation';

import {
  emptyDonationForm,
  DonationFormValues,
} from '../src/types/kaveesha-donation.types';

describe('validateDonationForm', () => {
  const validValues: DonationFormValues = {
    ...emptyDonationForm,

    // Food Information
    foodType: 'Rice & Curry',
    foodCategory: 'Cooked Meals',

    // Quantity
    quantity: '30',
    numberOfPortions: '30',

    // Time
    preparationTime: '2026-08-22T18:00',
    expiryTime: '2026-08-22T22:00',

    // Storage & Safety
    storageCondition: 'Refrigerated',
    allergenInfo: 'None',
    packagingCondition: 'Sealed and clean',

    // Pickup Information
    pickupAddress: '123 Main Street, Colombo',
    pickupDistrict: 'Colombo',
    pickupWindowStart: '5:00 PM',
    pickupWindowEnd: '7:00 PM',
  };

  it('returns no errors for a fully valid form', () => {
    const errors = validateDonationForm(validValues);
    expect(isFormValid(errors)).toBe(true);
  });

  it('requires foodType', () => {
    const errors = validateDonationForm({
      ...validValues,
      foodType: '',
    });

    expect(errors.foodType).toBeDefined();
  });

  it('rejects a non-numeric quantity', () => {
    const errors = validateDonationForm({
      ...validValues,
      quantity: 'abc',
    });

    expect(errors.quantity).toBeDefined();
  });

  it('rejects a zero quantity', () => {
    const errors = validateDonationForm({
      ...validValues,
      quantity: '0',
    });

    expect(errors.quantity).toBeDefined();
  });

  it('rejects an empty quantity', () => {
    const errors = validateDonationForm({
      ...validValues,
      quantity: '',
    });

    expect(errors.quantity).toBeDefined();
  });

  it('requires numberOfPortions', () => {
    const errors = validateDonationForm({
      ...validValues,
      numberOfPortions: '',
    });

    expect(errors.numberOfPortions).toBeDefined();
  });

  it('requires preparationTime', () => {
    const errors = validateDonationForm({
      ...validValues,
      preparationTime: '',
    });

    expect(errors.preparationTime).toBeDefined();
  });

  it('requires expiryTime to be after preparationTime', () => {
    const errors = validateDonationForm({
      ...validValues,
      preparationTime: '2026-08-22T20:00',
      expiryTime: '2026-08-22T18:00',
    });

    expect(errors.expiryTime).toBeDefined();
  });

  it('accepts expiryTime equal to preparationTime as invalid (must be strictly after)', () => {
    const errors = validateDonationForm({
      ...validValues,
      preparationTime: '2026-08-22T18:00',
      expiryTime: '2026-08-22T18:00',
    });

    expect(errors.expiryTime).toBeDefined();
  });
});

describe('isFormValid', () => {
  it('returns true for an empty errors object', () => {
    expect(isFormValid({})).toBe(true);
  });

  it('returns false when any error key is present', () => {
    expect(isFormValid({ foodType: 'Required' })).toBe(false);
  });
});