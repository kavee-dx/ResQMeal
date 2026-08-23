/**
 * kaveesha-getDonations.route.test.js
 * Location: backend/tests/kaveesha-getDonations.route.test.js
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
  find: jest.fn(),
  findOne: jest.fn(),
}));

const Donation = require('../src/models/kaveesha-Donation.model');
const getDonationsRoute = require('../src/routes/kaveesha-getDonations.route');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/donor/donations', getDonationsRoute);
  return app;
}

describe('GET /api/donor/donations', () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the donor's donations sorted newest-first", async () => {
    const sortMock = jest.fn().mockResolvedValue([{ _id: 'd1' }, { _id: 'd2' }]);
    Donation.find.mockReturnValue({ sort: sortMock });

    const res = await request(buildApp()).get('/api/donor/donations');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(Donation.find).toHaveBeenCalledWith({ donor: 'mockDonorId123' });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('filters by status when a status query param is given', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Donation.find.mockReturnValue({ sort: sortMock });

    await request(buildApp()).get('/api/donor/donations?status=active');

    expect(Donation.find).toHaveBeenCalledWith({ donor: 'mockDonorId123', status: 'active' });
  });

  it('treats status=all the same as no filter', async () => {
    const sortMock = jest.fn().mockResolvedValue([]);
    Donation.find.mockReturnValue({ sort: sortMock });

    await request(buildApp()).get('/api/donor/donations?status=all');

    expect(Donation.find).toHaveBeenCalledWith({ donor: 'mockDonorId123' });
  });

  it('returns 500 if the query fails', async () => {
    Donation.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error('boom')) });

    const res = await request(buildApp()).get('/api/donor/donations');

    expect(res.status).toBe(500);
  });
});

describe('GET /api/donor/donations/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a single donation owned by the donor', async () => {
    Donation.findOne.mockResolvedValue({ _id: 'd1', foodType: 'Rice' });

    const res = await request(buildApp()).get('/api/donor/donations/d1');

    expect(res.status).toBe(200);
    expect(res.body.data.foodType).toBe('Rice');
    expect(Donation.findOne).toHaveBeenCalledWith({ _id: 'd1', donor: 'mockDonorId123' });
  });

  it('returns 404 when the donation does not exist, or belongs to someone else', async () => {
    Donation.findOne.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/donor/donations/not-mine');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});