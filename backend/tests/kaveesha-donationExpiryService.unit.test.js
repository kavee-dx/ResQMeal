// backend/tests/kaveesha-donationExpiryService.unit.test.js
// Owner: Kaveesha
//
// Unit tests for the expiry service
// (src/services/kaveesha-donationExpiryService.js). The models and the push
// sender are mocked, so this checks which queries the cron sweep makes and
// which alerts it writes - without a database.

jest.mock('../src/models/kaveesha-Donation', () => ({
  find: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock('../src/models/kaveesha-ExpiryAlert', () => ({
  create: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock('../src/services/kaveesha-expoPushNotificationService', () => ({
  sendPushToDonor: jest.fn(),
}));

const Donation = require('../src/models/kaveesha-Donation');
const ExpiryAlert = require('../src/models/kaveesha-ExpiryAlert');
const { sendPushToDonor } = require('../src/services/kaveesha-expoPushNotificationService');

const {
  ALERT_RULES,
  generateExpiryAlerts,
  expireOverdueDonations,
  isDonationExpired,
  expireDonationIfNeeded,
} = require('../src/services/kaveesha-donationExpiryService');

const NOW = new Date('2026-10-19T12:00:00.000Z');

function minutesFromNow(minutes) {
  return new Date(NOW.getTime() + minutes * 60_000);
}

function makeDonationDoc(overrides = {}) {
  return {
    _id: '651f0c000000000000000001',
    donor: '651f0c0000000000000000a1',
    foodType: 'Rice & Curry',
    donationCode: 'RM-2026-123456',
    status: 'active',
    availabilityEnd: minutesFromNow(6 * 60 + 1),
    ...overrides,
  };
}

/* Donation.find(...).select(...) resolves to the rows the sweep reads. */
function stubFind(rows) {
  Donation.find.mockReturnValue({
    select: jest.fn().mockResolvedValue(rows),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  /* The sweep logs on every alert; keep the test output readable. */
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('ALERT_RULES', () => {
  it('warns at six hours, two hours and thirty minutes', () => {
    expect(ALERT_RULES.map((rule) => rule.thresholdMinutes)).toEqual([
      360, 120, 30,
    ]);

    expect(ALERT_RULES.map((rule) => rule.type)).toEqual([
      'EXPIRING_6_HOURS',
      'EXPIRING_2_HOURS',
      'EXPIRING_30_MINUTES',
    ]);
  });

  it('names the food the donor posted instead of a generic message', () => {
    const message = ALERT_RULES[1].message({ foodType: 'Bread packs' });

    expect(message).toContain('Bread packs');
    expect(message).toContain('2 hours');
  });
});

describe('generateExpiryAlerts', () => {
  it('only reads donations that can still be rescued', async () => {
    stubFind([]);

    await generateExpiryAlerts();

    expect(Donation.find).toHaveBeenCalledWith({
      status: { $in: ['pending', 'active'] },
      availabilityEnd: { $gt: NOW },
    });

    expect(Donation.find.mock.calls[0][0].availabilityEnd.$gt.getTime()).toBe(
      NOW.getTime(),
    );
  });

  it('writes an alert the moment the rescue window is inside six hours', async () => {
    stubFind([makeDonationDoc({ availabilityEnd: minutesFromNow(359) })]);

    ExpiryAlert.create.mockResolvedValue({ _id: 'alert-1' });
    sendPushToDonor.mockResolvedValue({ success: true });
    ExpiryAlert.updateOne.mockResolvedValue({});

    const result = await generateExpiryAlerts();

    expect(result).toEqual({ success: true, createdCount: 1 });
    expect(ExpiryAlert.create).toHaveBeenCalledTimes(1);

    const alert = ExpiryAlert.create.mock.calls[0][0];

    expect(alert.type).toBe('EXPIRING_6_HOURS');
    expect(alert.donation).toBe('651f0c000000000000000001');
    expect(alert.donor).toBe('651f0c0000000000000000a1');
    expect(alert.read).toBe(false);
    expect(alert.pushNotificationSent).toBe(false);
    expect(alert.triggeredAt).toEqual(NOW);
    expect(alert.message).toContain('Rice & Curry');
  });

  it('stays quiet while the window is still comfortably open', async () => {
    stubFind([makeDonationDoc({ availabilityEnd: minutesFromNow(361) })]);

    const result = await generateExpiryAlerts();

    expect(result).toEqual({ success: true, createdCount: 0 });
    expect(ExpiryAlert.create).not.toHaveBeenCalled();
  });

  it('marks the alert as pushed only when Expo actually accepted it', async () => {
    stubFind([makeDonationDoc({ availabilityEnd: minutesFromNow(359) })]);

    ExpiryAlert.create.mockResolvedValue({ _id: 'alert-1' });
    sendPushToDonor.mockResolvedValue({ success: true });
    ExpiryAlert.updateOne.mockResolvedValue({});

    await generateExpiryAlerts();

    expect(sendPushToDonor).toHaveBeenCalledWith({
      donorId: '651f0c0000000000000000a1',
      title: 'Rescue Window Ending Soon',
      body: expect.stringContaining('Rice & Curry'),
      data: {
        type: 'EXPIRY_ALERT',
        alertId: 'alert-1',
        donationId: '651f0c000000000000000001',
      },
    });

    expect(ExpiryAlert.updateOne).toHaveBeenCalledWith(
      { _id: 'alert-1' },
      { $set: { pushNotificationSent: true } },
    );
  });

  it('keeps the stored alert unread-flagged when the push fails', async () => {
    stubFind([makeDonationDoc({ availabilityEnd: minutesFromNow(359) })]);

    ExpiryAlert.create.mockResolvedValue({ _id: 'alert-1' });
    sendPushToDonor.mockResolvedValue({ success: false });

    const result = await generateExpiryAlerts();

    expect(result.createdCount).toBe(1);
    expect(ExpiryAlert.updateOne).not.toHaveBeenCalled();
  });

  it('counts every threshold it has crossed, so a late sweep catches up', async () => {
    stubFind([makeDonationDoc({ availabilityEnd: minutesFromNow(25) })]);

    ExpiryAlert.create.mockResolvedValue({ _id: 'alert-x' });
    sendPushToDonor.mockResolvedValue({ success: true });
    ExpiryAlert.updateOne.mockResolvedValue({});

    const result = await generateExpiryAlerts();

    const types = ExpiryAlert.create.mock.calls.map(
      (call) => call[0].type,
    );

    expect(result.createdCount).toBe(3);
    expect(types).toEqual([
      'EXPIRING_6_HOURS',
      'EXPIRING_2_HOURS',
      'EXPIRING_30_MINUTES',
    ]);
  });

  it('ignores a duplicate alert, because the unique index already covers it', async () => {
    stubFind([makeDonationDoc({ availabilityEnd: minutesFromNow(359) })]);

    ExpiryAlert.create.mockRejectedValue(
      Object.assign(new Error('duplicate key'), { code: 11000 }),
    );

    const result = await generateExpiryAlerts();

    expect(result).toEqual({ success: true, createdCount: 0 });
    expect(sendPushToDonor).not.toHaveBeenCalled();
  });

  it('reports any other write failure without crashing the cron job', async () => {
    stubFind([makeDonationDoc({ availabilityEnd: minutesFromNow(359) })]);

    ExpiryAlert.create.mockRejectedValue(new Error('write concern failed'));

    const result = await generateExpiryAlerts();

    expect(result).toEqual({ success: true, createdCount: 0 });
  });

  it('skips a row with no usable window instead of comparing against NaN', async () => {
    stubFind([
      makeDonationDoc({ availabilityEnd: undefined }),
      makeDonationDoc({ _id: 'bad', availabilityEnd: 'not a date' }),
    ]);

    const result = await generateExpiryAlerts();

    expect(result).toEqual({ success: true, createdCount: 0 });
    expect(ExpiryAlert.create).not.toHaveBeenCalled();
  });

  it('fails softly when the read itself breaks', async () => {
    Donation.find.mockImplementation(() => {
      throw new Error('database is down');
    });

    const result = await generateExpiryAlerts();

    expect(result.success).toBe(false);
    expect(result.createdCount).toBe(0);
    expect(result.error).toBe('database is down');
  });
});

describe('expireOverdueDonations', () => {
  it('expires every open donation whose window has passed', async () => {
    Donation.updateMany.mockResolvedValue({ modifiedCount: 3 });

    const result = await expireOverdueDonations();

    expect(Donation.updateMany).toHaveBeenCalledWith(
      {
        availabilityEnd: { $lt: NOW },
        status: { $nin: ['completed', 'cancelled', 'expired'] },
      },
      { $set: { status: 'expired' } },
    );

    expect(result).toEqual({ success: true, modifiedCount: 3 });
  });

  it('reports zero when nothing was overdue', async () => {
    Donation.updateMany.mockResolvedValue({ modifiedCount: 0 });

    expect(await expireOverdueDonations()).toEqual({
      success: true,
      modifiedCount: 0,
    });
  });

  it('never re-delivers a donation that already reached a final state', async () => {
    Donation.updateMany.mockResolvedValue({ modifiedCount: 0 });

    await expireOverdueDonations();

    const exempt =
      Donation.updateMany.mock.calls[0][0].status.$nin;

    expect(exempt).toEqual(
      expect.arrayContaining(['completed', 'cancelled', 'expired']),
    );
  });

  it('fails softly when the sweep cannot write', async () => {
    Donation.updateMany.mockRejectedValue(new Error('timeout'));

    expect(await expireOverdueDonations()).toEqual({
      success: false,
      modifiedCount: 0,
      error: 'timeout',
    });
  });
});

describe('isDonationExpired', () => {
  it('says no to a missing donation', () => {
    expect(isDonationExpired(null)).toBe(false);
    expect(isDonationExpired(undefined)).toBe(false);
  });

  it('says no to a donation that already reached a final state', () => {
    ['completed', 'cancelled', 'expired'].forEach((status) => {
      expect(
        isDonationExpired({ status, availabilityEnd: minutesFromNow(-60) }),
      ).toBe(false);
    });
  });

  it('says no while the window is still open', () => {
    expect(
      isDonationExpired({ status: 'active', availabilityEnd: minutesFromNow(5) }),
    ).toBe(false);
  });

  it('says yes the moment the window has passed', () => {
    expect(
      isDonationExpired({ status: 'active', availabilityEnd: minutesFromNow(-1) }),
    ).toBe(true);

    expect(
      isDonationExpired({ status: 'pending', availabilityEnd: minutesFromNow(-1440) }),
    ).toBe(true);
  });

  it('says no when there is no window to measure', () => {
    expect(isDonationExpired({ status: 'active' })).toBe(false);
    expect(isDonationExpired({ status: 'active', availabilityEnd: null })).toBe(
      false,
    );
    expect(
      isDonationExpired({ status: 'active', availabilityEnd: 'someday' }),
    ).toBe(false);
  });
});

describe('expireDonationIfNeeded', () => {
  it('leaves a missing donation missing', async () => {
    await expect(expireDonationIfNeeded(null)).resolves.toBeNull();
  });

  it('returns the donation untouched while it is still rescuable', async () => {
    const save = jest.fn();
    const donation = {
      status: 'active',
      availabilityEnd: minutesFromNow(120),
      save,
    };

    await expect(expireDonationIfNeeded(donation)).resolves.toBe(donation);

    expect(donation.status).toBe('active');
    expect(save).not.toHaveBeenCalled();
  });

  it('saves the donation as expired once the window has passed', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const donation = {
      status: 'active',
      availabilityEnd: minutesFromNow(-1),
      save,
    };

    const result = await expireDonationIfNeeded(donation);

    expect(result.status).toBe('expired');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('lets the caller see a failed write instead of hiding it', async () => {
    const donation = {
      status: 'active',
      availabilityEnd: minutesFromNow(-1),
      save: jest.fn().mockRejectedValue(new Error('validation failed')),
    };

    await expect(expireDonationIfNeeded(donation)).rejects.toThrow(
      'validation failed',
    );
  });
});
