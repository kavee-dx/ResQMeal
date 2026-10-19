// backend/tests/kaveesha-jwt.unit.test.js
// Owner: Kaveesha
//
// Unit tests for the session token helpers (src/utils/kaveesha-jwt.js).
// The module reads its secret when it is loaded, so each case sets the
// environment and requires a fresh copy.

const SECRET = 'unit-test-secret-not-a-real-key';

function loadWith(env) {
  jest.resetModules();

  const keys = Object.keys(env);
  const backup = keys.map((key) => process.env[key]);

  keys.forEach((key) => {
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  });

  /*
   * The module reads the secret once, at load time, so the real environment
   * can go back as soon as it has been required.
   */
  const loaded = require('../src/utils/kaveesha-jwt');

  keys.forEach((key, index) => {
    if (backup[index] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = backup[index];
    }
  });

  return loaded;
}

const donor = {
  _id: '651f0c0000000000000000a1',
  role: 'DONOR',
};

describe('signToken', () => {
  it('carries exactly the identity the API middleware needs', () => {
    const { signToken, verifyToken } = loadWith({
      JWT_SECRET: SECRET,
      JWT_EXPIRES_IN: '1h',
    });

    const decoded = verifyToken(signToken(donor));

    expect(decoded.id).toBe(donor._id);
    expect(decoded.role).toBe('DONOR');
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  it('never puts the account details a client can fake into the token', () => {
    const { signToken, verifyToken } = loadWith({ JWT_SECRET: SECRET });

    const decoded = verifyToken(
      signToken({ ...donor, email: 'donor@example.com', password: 'hunter2' }),
    );

    expect(decoded.email).toBeUndefined();
    expect(decoded.password).toBeUndefined();
  });

  it('signs a different token for a different role', () => {
    const { signToken, verifyToken } = loadWith({ JWT_SECRET: SECRET });

    expect(verifyToken(signToken({ _id: 'ngo-1', role: 'NGO' })).role).toBe(
      'NGO',
    );
  });

  it('honours the lifetime the environment asks for', () => {
    const { signToken } = loadWith({
      JWT_SECRET: SECRET,
      JWT_EXPIRES_IN: '2h',
    });

    const decoded = require('jsonwebtoken').decode(
      signToken(donor),
    );

    expect(decoded.exp - decoded.iat).toBe(2 * 60 * 60);
  });

  it('falls back to one hour when no lifetime is configured', () => {
    const { signToken } = loadWith({
      JWT_SECRET: SECRET,
      JWT_EXPIRES_IN: undefined,
    });

    const decoded = require('jsonwebtoken').decode(signToken(donor));

    expect(decoded.exp - decoded.iat).toBe(60 * 60);
  });

  it('refuses to sign anything when the secret is missing', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { signToken } = loadWith({ JWT_SECRET: undefined });

    expect(() => signToken(donor)).toThrow();

    jest.restoreAllMocks();
  });
});

describe('verifyToken', () => {
  it('rejects a token signed by another key', () => {
    const attacker = loadWith({ JWT_SECRET: 'another-secret' });
    const honest = loadWith({ JWT_SECRET: SECRET });

    const forged = attacker.signToken(donor);

    expect(() => honest.verifyToken(forged)).toThrow(/signature/i);
  });

  it('rejects a token whose payload was edited', () => {
    const { signToken, verifyToken } = loadWith({ JWT_SECRET: SECRET });
    const jsonwebtoken = require('jsonwebtoken');

    const token = signToken(donor);
    const parts = token.split('.');

    const edited = `${Buffer.from(
      JSON.stringify({ ...donor, role: 'ADMIN', iat: 1, exp: 9999999999 }),
    ).toString('base64url')}.`;

    const tampered = [parts[0], edited, parts[2]].join('.');

    expect(() => verifyToken(tampered)).toThrow();
    expect(() => verifyToken('not-a-token')).toThrow(/malformed/i);
    expect(jsonwebtoken.decode(token).role).toBe('DONOR');
  });

  it('rejects a session that has run out', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-19T12:00:00.000Z'));

    const { signToken, verifyToken } = loadWith({
      JWT_SECRET: SECRET,
      JWT_EXPIRES_IN: '1m',
    });

    const token = signToken(donor);

    expect(() => verifyToken(token)).not.toThrow();

    jest.advanceTimersByTime(61_000);

    expect(() => verifyToken(token)).toThrow(/expired/i);

    jest.useRealTimers();
  });
});
