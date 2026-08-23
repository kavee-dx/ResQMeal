/**
 * kaveesha-deleteDonation.route.test.js
 * Location: backend/tests/kaveesha-deleteDonation.route.test.js
 */

const request = require('supertest');
const express = require('express');

jest.mock(
  '../src/middleware/auth',
  () => ({
    requireAuth: (req, res, next) => {
      req.user = { _id: 'mockDonorId123' };
      next();
    },
  }),
  { virtual: true }
);

jest.mock('../src/models/kaveesha-Donation.model', () => ({
  findOne: jest.fn(),
}));

const Donation = require('../src/models/kaveesha-Donation.model');
const deleteDonationRoute = require('../src/routes/kaveesha-deleteDonation.route');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/donor/donations', deleteDonationRoute);
  return app;
}

describe('DELETE /api/donor/donations/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a pending donation', async () => {
    const deleteOne = jest.fn().mockResolvedValue(true);
    Donation.findOne.mockResolvedValue({ _id: 'd1', status: 'pending', deleteOne });

    const res = await request(buildApp()).delete('/api/donor/donations/d1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(deleteOne).toHaveBeenCalled();
  });

  it('returns 404 when the donation is not found', async () => {
    Donation.findOne.mockResolvedValue(null);

    const res = await request(buildApp()).delete('/api/donor/donations/missing');

    expect(res.status).toBe(404);
  });

  it('blocks deleting a donation that is active (not pending)', async () => {
    const deleteOne = jest.fn();
    Donation.findOne.mockResolvedValue({ _id: 'd1', status: 'active', deleteOne });

    const res = await request(buildApp()).delete('/api/donor/donations/d1');

    expect(res.status).toBe(409);
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it('blocks deleting a donation that is already completed', async () => {
    const deleteOne = jest.fn();
    Donation.findOne.mockResolvedValue({ _id: 'd1', status: 'completed', deleteOne });

    const res = await request(buildApp()).delete('/api/donor/donations/d1');

    expect(res.status).toBe(409);
    expect(deleteOne).not.toHaveBeenCalled();
  });

  it('returns 500 if deletion throws unexpectedly', async () => {
    Donation.findOne.mockResolvedValue({
      _id: 'd1',
      status: 'pending',
      deleteOne: jest.fn().mockRejectedValue(new Error('boom')),
    });

    const res = await request(buildApp()).delete('/api/donor/donations/d1');

    expect(res.status).toBe(500);
  });
});