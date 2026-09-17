const mongoose = require('mongoose');
const Donation = require('../src/models/kaveesha-Donation.model');

describe('Donation model', () => {
  const validData = {
    donor: new mongoose.Types.ObjectId(),
    foodType: 'Rice & Curry',
    quantity: 30,
    numberOfPortions: 30,
    preparationTime: new Date('2026-08-22T18:00:00'),
    expiryTime: new Date('2026-08-22T22:00:00'),
  };

  it('passes validation with valid data', () => {
    const donation = new Donation(validData);
    expect(donation.validateSync()).toBeUndefined();
  });

  it('requires foodType', () => {
    const donation = new Donation({ ...validData, foodType: undefined });
    const err = donation.validateSync();
    expect(err.errors.foodType).toBeDefined();
  });

  it('requires a positive quantity', () => {
    const donation = new Donation({ ...validData, quantity: 0 });
    const err = donation.validateSync();
    expect(err.errors.quantity).toBeDefined();
  });

  it('requires a positive numberOfPortions', () => {
    const donation = new Donation({ ...validData, numberOfPortions: -5 });
    const err = donation.validateSync();
    expect(err.errors.numberOfPortions).toBeDefined();
  });

  it('rejects expiryTime before preparationTime', () => {
    const donation = new Donation({
      ...validData,
      preparationTime: new Date('2026-08-22T20:00:00'),
      expiryTime: new Date('2026-08-22T18:00:00'),
    });
    const err = donation.validateSync();
    expect(err.errors.expiryTime).toBeDefined();
  });

  it('defaults status to "pending"', () => {
    const donation = new Donation(validData);
    expect(donation.status).toBe('pending');
  });

  it('defaults priority to "medium"', () => {
    const donation = new Donation(validData);
    expect(donation.priority).toBe('medium');
  });

  it('rejects a status value outside the allowed enum', () => {
    const donation = new Donation({ ...validData, status: 'not-a-real-status' });
    const err = donation.validateSync();
    expect(err.errors.status).toBeDefined();
  });

  it('requires a donor reference', () => {
    const donation = new Donation({ ...validData, donor: undefined });
    const err = donation.validateSync();
    expect(err.errors.donor).toBeDefined();
  });
});