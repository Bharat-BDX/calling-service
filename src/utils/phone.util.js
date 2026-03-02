const crypto = require('crypto');
const { parsePhoneNumber } = require('libphonenumber-js');

function normalizeAndHashPhone(raw) {
  try {
    const phone = parsePhoneNumber(raw, 'US');
    if (!phone.isValid()) return null;

    const e164 = phone.number;
    return crypto.createHash('sha256').update(e164).digest('hex');
  } catch {
    return null;
  }
}

module.exports = { normalizeAndHashPhone };
