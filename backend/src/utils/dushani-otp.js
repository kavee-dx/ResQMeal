
/** Generates a 6-digit numeric verification code as a string, e.g. "045213" */
function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Returns a Date object N minutes from now (default 15 min expiry window) */
function getExpiryDate(minutes = 15) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

module.exports = { generateVerificationCode, getExpiryDate };
