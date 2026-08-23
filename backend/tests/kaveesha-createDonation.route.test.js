/**
 * kaveesha-createDonation.route.test.js
 * Location: backend/tests/kaveesha-createDonation.route.test.js
 *
 * Auth is mocked with { virtual: true } since backend/src/middleware/auth.js
 * won't exist until User Management is merged. Once it IS merged, remove
 * { virtual: true } and this mock will simply intercept the real module.
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
  create: jest.fn(),
}));

const Donation = require('../src/models/kaveesha-Donation.model');
const createDonationRoute = require('../src/routes/kaveesha-createDonation.route');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/donor/donations', createDonationRoute);
  return app;
}

const validPayload = {
  foodType: 'Rice & Curry',
  foodCategory: 'Cooked meals',
  quantity: 30,
  numberOfPortions: 30,
  preparationTime: '2026-08-22T18:00:00',
  expiryTime: '2026-08-22T22:00:00',
};

describe('POST /api/donor/donations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a donation and returns 201', async () => {
    Donation.create.mockResolvedValue({
      _id: 'donation1',
      ...validPayload,
      donor: 'mockDonorId123',
      status: 'pending',
    });

    const res = await request(buildApp()).post('/api/donor/donations').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.foodType).toBe('Rice & Curry');
  });

  it('sets the donor from req.user, not from the request body', async () => {
    Donation.create.mockResolvedValue({ _id: 'd1', ...validPayload, donor: 'mockDonorId123', status: 'pending' });

    await request(buildApp())
      .post('/api/donor/donations')
      .send({ ...validPayload, donor: 'someone-else-entirely' });

    expect(Donation.create).toHaveBeenCalledWith(
      expect.objectContaining({ donor: 'mockDonorId123' })
    );
  });

  it('defaults status to "pending" on creation', async () => {
    Donation.create.mockResolvedValue({ _id: 'd1', ...validPayload, status: 'pending' });

    await request(buildApp()).post('/api/donor/donations').send(validPayload);

    expect(Donation.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
  });

  it('rejects a payload missing foodType with 400', async () => {
    const res = await request(buildApp())
      .post('/api/donor/donations')
      .send({ ...validPayload, foodType: undefined });

    expect(res.status).toBe(400);
    expect(res.body.errors.foodType).toBeDefined();
    expect(Donation.create).not.toHaveBeenCalled();
  });

  it('returns 500 if the model throws an unexpected error', async () => {
    Donation.create.mockRejectedValue(new Error('DB connection lost'));

    const res = await request(buildApp()).post('/api/donor/donations').send(validPayload);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});