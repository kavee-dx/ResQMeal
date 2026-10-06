/**
 * amasha-mapNgosService.test.js
 * Location: backend/tests/map/amasha-mapNgosService.test.js
 *
 * Uses the shared in-memory MongoDB from tests/setup.js.
 */

// Spinning up the in-memory MongoDB can exceed Jest's default 5s hook
// timeout on slower machines, so give this suite more room.
jest.setTimeout(120000);

const User = require('../../src/models/dushani-User');
const NGOProfile = require('../../src/models/dushani-NGOProfile');
const PrivacySettings = require('../../src/models/amasha-PrivacySettings');
const { getNgoMapPoints } = require('../../src/services/amasha-mapNgosService');

let phoneCounter = 0;
function nextPhone() {
  phoneCounter += 1;
  return `07798765${String(phoneCounter).padStart(2, '0')}`;
}

function createNgo(overrides = {}) {
  return User.create({
    phoneNumber: nextPhone(),
    password: 'password123',
    role: 'NGO',
    address: '45 Temple Road',
    district: 'Kandy',
    city: 'Kandy',
    accountStatus: 'active',
    approvalStatus: 'APPROVED',
    ...overrides,
  });
}

const KANDY = { latitude: 7.2906, longitude: 80.6337 };

describe('getNgoMapPoints', () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      NGOProfile.deleteMany({}),
      PrivacySettings.deleteMany({}),
    ]);
  });

  it('shows the organization name from the NGO profile', async () => {
    const ngo = await createNgo();
    await NGOProfile.create({
      userId: ngo._id,
      organizationName: 'Kandy Food Bank',
      ngoRegistrationNumber: 'NGO-001',
      organizationType: 'CHARITY',
      authorizedPerson: 'Nimal',
      position: 'Director',
    });

    const { points, unplaced } = await getNgoMapPoints();

    expect(unplaced).toBe(0);
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      id: `${ngo._id}`,
      type: 'ngo',
      title: 'Kandy Food Bank',
      district: 'Kandy',
    });
    expect(points[0].description).toBe('Kandy, Kandy');
    expect(Math.abs(points[0].latitude - KANDY.latitude)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(points[0].longitude - KANDY.longitude)).toBeLessThanOrEqual(0.03);
  });

  it('falls back to a generic title when the NGO has no profile', async () => {
    await createNgo();

    const { points } = await getNgoMapPoints();

    expect(points[0].title).toBe('NGO partner');
  });

  it('excludes NGOs who turned off location sharing', async () => {
    const hiddenNgo = await createNgo();
    await createNgo({ district: 'Galle', city: 'Galle' });
    await PrivacySettings.create({ userId: hiddenNgo._id, showLocation: false });

    const { points } = await getNgoMapPoints();

    expect(points).toHaveLength(1);
    expect(points[0].district).toBe('Galle');
  });

  it('counts NGOs from unknown districts as unplaced', async () => {
    await createNgo({ district: 'Nowhere' });

    const { points, unplaced } = await getNgoMapPoints();

    expect(points).toHaveLength(0);
    expect(unplaced).toBe(1);
  });
});
