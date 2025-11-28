const crypto = require('crypto');
const { Buffer } = require('buffer');

/**
 * Set user context for Row-Level Security (RLS)
 */
async function setUserContext(client, userId) {
  await client.query('SELECT set_config($1, $2, false)', ['app.current_user_id', userId]);
}

/**
 * Reset user context (CRITICAL: must be called before releasing pooled connection)
 */
async function resetUserContext(client) {
  await client.query('RESET app.current_user_id');
}

/**
 * Generate secure checksum for payment verification
 */
function generateChecksum(data) {
  // Create payload with sorted keys to ensure consistency between frontend and backend
  const sortedPayload = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(sortedPayload).digest('hex');
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature) {
  if (!process.env.WEBHOOK_SECRET) return false;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

module.exports = {
  setUserContext,
  resetUserContext,
  generateChecksum,
  verifyWebhookSignature
};
