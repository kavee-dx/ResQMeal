/**
 * kaveesha-updateDonation.route.test.js
 * Location: backend/tests/kaveesha-updateDonation.route.test.js
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
const updateDonationRoute = require('../src/routes/kaveesha-updateDonation.route');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/donor/donations', updateDonationRoute);
  return app;
}

function mockDonation(overrides = {}) {
  return {
    _id: 'd1',
    status: 'pending',
    foodType: 'Rice & Curry',
    quantity: 30,
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('PATCH /api/donor/donations/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates an editable field on a pending donation', async () => {
    const donation = mockDonation();
    Donation.findOne.mockResolvedValue(donation);

    const res = await request(buildApp()).patch('/api/donor/donations/d1').send({ quantity: 25 });

    expect(res.status).toBe(200);
    expect(donation.quantity).toBe(25);
    expect(donation.save).toHaveBeenCalled();
  });

  it('ignores fields that are not in the editable whitelist', async () => {
    const donation = mockDonation();
    Donation.findOne.mockResolvedValue(donation);

    await request(buildApp()).patch('/api/donor/donations/d1').send({ status: 'completed', donor: 'someone-else' });

    // status/donor are not in EDITABLE_FIELDS, so they must not change
    expect(donation.status).toBe('pending');
    expect(donation.donor).toBeUndefined();
  });

  it('returns 404 when the donation is not found', async () => {
    Donation.findOne.mockResolvedValue(null);

    const res = await request(buildApp()).patch('/api/donor/donations/missing').send({ quantity: 25 });

    expect(res.status).toBe(404);
  });

  it('blocks editing a completed donation with 409', async () => {
    Donation.findOne.mockResolvedValue(mockDonation({ status: 'completed' }));

    const res = await request(buildApp()).patch('/api/donor/donations/d1').send({ quantity: 25 });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/completed/i);
  });

  it('blocks editing a cancelled donation with 409', async () => {
    Donation.findOne.mockResolvedValue(mockDonation({ status: 'cancelled' }));

    const res = await request(buildApp()).patch('/api/donor/donations/d1').send({ quantity: 25 });

    expect(res.status).toBe(409);
  });

  it('allows editing an active donation (not yet completed/cancelled)', async () => {
    const donation = mockDonation({ status: 'active' });
    Donation.findOne.mockResolvedValue(donation);

    const res = await request(buildApp()).patch('/api/donor/donations/d1').send({ quantity: 25 });

    expect(res.status).toBe(200);
  });

  it('rejects an invalid quantity with 400 before touching the document', async () => {
    const donation = mockDonation();
    Donation.findOne.mockResolvedValue(donation);

    const res = await request(buildApp()).patch('/api/donor/donations/d1').send({ quantity: -10 });

    expect(res.status).toBe(400);
    expect(donation.save).not.toHaveBeenCalled();
  });
});