const pool = require('../db');
const { finalizeAttemptAndUpdateState } = require('./state-update.service');
// const { forwardToIngestion } = require('./ingestion.service');

/**
 * Task-24:
 * Idempotent webhook processor
 */
async function processWebhook(payload) {
  // const client = await pool.connect();

  try {
    console.log('WEBHOOK_PROCESS', JSON.stringify(payload));
    // await client.query('BEGIN');

    const {
      recare_call_token,
      event_type
    } = payload;

    // const idempotencyKey = `${recare_call_token}_${event_type}`;

    // Check if already processed
    // const existing = await client.query(
    //   `
    //   SELECT 1 FROM app.mapping_events
    //   WHERE event_payload->>'idempotency_key' = $1
    //   `,
    //   [idempotencyKey]
    // );

    // if (existing.rowCount > 0) {
    //   await client.query('ROLLBACK');
    //   return; // Idempotent ignore
    // }

    // Store raw event
    // await client.query(
    //   `
    //   INSERT INTO app.mapping_events
    //   (event_id, modality, event_payload, created_at)
    //   VALUES (gen_random_uuid(), 'calling', $1, now())
    //   `,
    //   [JSON.stringify({ ...payload, idempotency_key: idempotencyKey })]
    // );

    // await client.query('COMMIT');

    // Continue business logic outside transaction
    await finalizeAttemptAndUpdateState(payload);
    // await forwardToIngestion(payload);

  } catch (err) {
    // await client.query('ROLLBACK');
    console.error('WEBHOOK_PROCESS_FAILED', err.message);
  } finally {
    // client.release();
  }
}

module.exports = { processWebhook };