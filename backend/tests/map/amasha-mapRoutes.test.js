/**
 * amasha-mapRoutes.test.js
 * Location: backend/tests/map/amasha-mapRoutes.test.js
 *
 * Integration test for the map routes: donation/request points stay public,
 * donor/NGO points require a valid Bearer token.
 */

// Spinning up the in-memory MongoDB can exceed Jest's default 5s hook
// timeout on slower machines, so give this suite more room.
jest.setTimeout(120000);

// Must be set before kaveesha-jwt is required (it reads JWT_SECRET at load).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'amasha-test-secret';

const request = require('supertest');
const express = require('express');
const User = require('../../src/models/dushani-User');
const NGOProfile = require('../../src/models/dushani-NGOProfile');
const PrivacySettings = require('../../src/models/amasha-PrivacySettings');
const { signToken } = require('../../src/utils/kaveesha-jwt');
const mapRoutes = require('../../src/routes/amasha-mapRoutes');

function buildApp() {
  const app = express();
  app.use('/api/monitoring/map', mapRoutes);
  return app;
}

let phoneCounter = 0;
function nextPhone() {
  phoneCounter += 1;
  return `07756789${String(phoneCounter).padStart(2, '0')}`;
}

describe('Map routes', () => {
  let token;

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      NGOProfile.deleteMany({}),
      PrivacySettings.deleteMany({}),
    ]);
    token = signToken({ _id: 'mapViewer1', role: 'RECIPIENT' });
  });

  it('keeps donation points public (no token needed)', async () => {
    const res = await request(buildApp()).get('/api/monitoring/map/donations');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.points)).toBe(true);
  });

  it('keeps request points public (no token needed)', async () => {
    const res = await request(buildApp()).get('/api/monitoring/map/requests');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.points)).toBe(true);
  });

  it('rejects donor points without a token', async () => {
    const res = await request(buildApp()).get('/api/monitoring/map/donors');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects NGO points with a malformed token', async () => {
    const res = await request(buildApp())
      .get('/api/monitoring/map/ngos')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns donor points for a logged-in user', async () => {
    await User.create({
      fullName: 'Sunil Restaurant',
      phoneNumber: nextPhone(),
      password: 'password123',
      role: 'DONOR',
      address: '1 Main St',
      district: 'Colombo',
      city: 'Colombo',
      accountStatus: 'active',
      approvalStatus: 'APPROVED',
    });

    const res = await request(buildApp())
      .get('/api/monitoring/map/donors')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.points).toHaveLength(1);
    expect(res.body.points[0].title).toBe('Sunil Restaurant');
    expect(res.body.points[0].type).toBe('donor');
  });

  it('returns NGO points with the organization name for a logged-in user', async () => {
    const ngo = await User.create({
      phoneNumber: nextPhone(),
      password: 'password123',
      role: 'NGO',
      address: '2 Lake Rd',
      district: 'Galle',
      city: 'Galle',
      accountStatus: 'active',
      approvalStatus: 'APPROVED',
    });
    await NGOProfile.create({
      userId: ngo._id,
      organizationName: 'Galle Relief Circle',
      ngoRegistrationNumber: 'NGO-100',
      organizationType: 'RELIEF_ORGANIZATION',
      authorizedPerson: 'Saman',
      position: 'Chair',
    });

    const res = await request(buildApp())
      .get('/api/monitoring/map/ngos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.points).toHaveLength(1);
    expect(res.body.points[0].title).toBe('Galle Relief Circle');
    expect(res.body.points[0].type).toBe('ngo');
  });
});
