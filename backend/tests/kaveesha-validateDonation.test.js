/**
 * kaveesha-validateDonation.test.js
 * Location: backend/tests/kaveesha-validateDonation.test.js
 */

const { validateDonationPayload } = require('../src/middleware/kaveesha-validateDonation');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validateDonationPayload (create)', () => {
  const validBody = {
    foodType: 'Rice & Curry',
    quantity: 30,
    numberOfPortions: 30,
    preparationTime: '2026-08-22T18:00:00',
    expiryTime: '2026-08-22T22:00:00',
  };

  it('calls next() when all required fields are valid', () => {
    const req = { body: validBody };
    const res = mockRes();
    const next = jest.fn();

    validateDonationPayload(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a missing foodType', () => {
    const req = { body: { ...validBody, foodType: undefined } };
    const res = mockRes();
    const next = jest.fn();

    validateDonationPayload(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].errors.foodType).toBeDefined();
  });

  it('rejects a non-positive quantity', () => {
    const req = { body: { ...validBody, quantity: 0 } };
    const res = mockRes();
    const next = jest.fn();

    validateDonationPayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].errors.quantity).toBeDefined();
  });

  it('rejects a non-positive numberOfPortions', () => {
    const req = { body: { ...validBody, numberOfPortions: -3 } };
    const res = mockRes();
    const next = jest.fn();

    validateDonationPayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].errors.numberOfPortions).toBeDefined();
  });

  it('rejects a missing preparationTime', () => {
    const req = { body: { ...validBody, preparationTime: undefined } };
    const res = mockRes();
    const next = jest.fn();

    validateDonationPayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].errors.preparationTime).toBeDefined();
  });

  it('rejects expiryTime before preparationTime', () => {
    const req = {
      body: { ...validBody, preparationTime: '2026-08-22T20:00:00', expiryTime: '2026-08-22T18:00:00' },
    };
    const res = mockRes();
    const next = jest.fn();

    validateDonationPayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].errors.expiryTime).toBeDefined();
  });
});