/**
 * amasha-mapDonorsService.test.js
 * Location: backend/tests/map/amasha-mapDonorsService.test.js
 *
 * Uses the shared in-memory MongoDB from tests/setup.js.
 */

// Spinning up the in-memory MongoDB can exceed Jest's default 5s hook
// timeout on slower machines, so give this suite more room.
jest.setTimeout(120000);

const User = require('../../src/models/dushani-User');
const PrivacySettings = require('../../src/models/amasha-PrivacySettings');
const { getDonorMapPoints } = require('../../src/services/amasha-mapDonorsService');

let phoneCounter = 0;
function nextPhone() {
  phoneCounter += 1;
  return `07712345${String(phoneCounter).padStart(2, '0')}`;
}

function createDonor(overrides = {}) {
  return User.create({
    fullName: 'Kamal Perera',
    phoneNumber: nextPhone(),
    password: 'password123',
    role: 'DONOR',
    address: '12 Galle Road',
    district: 'Colombo',
    city: 'Dehiwala',
    accountStatus: 'active',
    approvalStatus: 'APPROVED',
    ...overrides,
  });
}

const COLOMBO = { latitude: 6.9271, longitude: 79.8612 };

describe('getDonorMapPoints', () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      PrivacySettings.deleteMany({}),
    ]);
  });

  it('places an approved active donor at their district', async () => {
    const donor = await createDonor();

    const { points, unplaced } = await getDonorMapPoints();

    expect(unplaced).toBe(0);
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      id: `${donor._id}`,
      type: 'donor',
      title: 'Kamal Perera',
      district: 'Colombo',
    });
    expect(points[0].description).toBe('Dehiwala, Colombo');
    // District-level placement with a small display jitter only.
    expect(Math.abs(points[0].latitude - COLOMBO.latitude)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(points[0].longitude - COLOMBO.longitude)).toBeLessThanOrEqual(0.03);
  });

  it('excludes donors who turned off location sharing', async () => {
    const hiddenDonor = await createDonor({ fullName: 'Hidden Donor' });
    await createDonor({ fullName: 'Visible Donor' });
    await PrivacySettings.create({ userId: hiddenDonor._id, showLocation: false });

    const { points } = await getDonorMapPoints();

    const titles = points.map((point) => point.title);
    expect(titles).toContain('Visible Donor');
    expect(titles).not.toContain('Hidden Donor');
  });

  it('excludes pending and inactive donors', async () => {
    await createDonor({ fullName: 'Pending Donor', approvalStatus: 'PENDING' });
    await createDonor({ fullName: 'Inactive Donor', accountStatus: 'inactive' });

    const { points } = await getDonorMapPoints();

    expect(points.map((point) => point.title)).toEqual([]);
  });

  it('counts donors from unknown districts as unplaced', async () => {
    await createDonor({ district: 'Atlantis' });

    const { points, unplaced } = await getDonorMapPoints();

    expect(points).toHaveLength(0);
    expect(unplaced).toBe(1);
  });

  it('falls back to a generic title when the donor has no name', async () => {
    await createDonor({ fullName: undefined });

    const { points } = await getDonorMapPoints();

    expect(points[0].title).toBe('Food donor');
  });
});
