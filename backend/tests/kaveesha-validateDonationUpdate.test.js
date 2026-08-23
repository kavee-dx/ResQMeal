/**
 * kaveesha-validateDonationUpdate.test.js
 * Location: backend/tests/kaveesha-validateDonationUpdate.test.js
 */

const { validateDonationUpdatePayload } = require('../src/middleware/kaveesha-validateDonationUpdate');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validateDonationUpdatePayload (partial update)', () => {
  it('allows an empty body — no fields being changed', () => {
    const req = { body: {} };
    const res = mockRes();
    const next = jest.fn();

    validateDonationUpdatePayload(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows updating a single valid field', () => {
    const req = { body: { quantity: 25 } };
    const res = mockRes();
    const next = jest.fn();

    validateDonationUpdatePayload(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects a non-positive quantity when quantity is being updated', () => {
    const req = { body: { quantity: -5 } };
    const res = mockRes();
    const next = jest.fn();

    validateDonationUpdatePayload(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an empty foodType string', () => {
    const req = { body: { foodType: '   ' } };
    const res = mockRes();
    const next = jest.fn();

    validateDonationUpdatePayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('does not touch foodType validation when foodType is not in the body', () => {
    const req = { body: { quantity: 10 } };
    const res = mockRes();
    const next = jest.fn();

    validateDonationUpdatePayload(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects expiryTime before preparationTime when both are sent', () => {
    const req = { body: { preparationTime: '2026-08-22T20:00', expiryTime: '2026-08-22T18:00' } };
    const res = mockRes();
    const next = jest.fn();

    validateDonationUpdatePayload(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('allows a new expiryTime when preparationTime is not part of this update', () => {
    const req = { body: { expiryTime: '2026-08-22T23:00' } };
    const res = mockRes();
    const next = jest.fn();

    validateDonationUpdatePayload(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});