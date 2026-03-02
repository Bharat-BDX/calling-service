const crypto = require('crypto');

/**
 * Task-24:
 * Verify Retell webhook authenticity.
 * Reject before processing if invalid.
 */
function verifySignature(rawBody, signatureHeader) {
  const secret = 'key_042baf5bb48a6fedc4f39a789d34';

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return expected === signatureHeader;
}

module.exports = { verifySignature };