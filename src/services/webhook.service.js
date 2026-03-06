const pool = require('../db');
const { finalizeAttemptAndUpdateState } = require('./state-update.service');
const { forwardToIngestion } = require('./ingestion.service');

/**
 * Task-24:
 * Idempotent webhook processor
 */
async function processWebhook(payload) {
  const client = await pool.connect();

  try {
    console.log('WEBHOOK_PROCESS', JSON.stringify(payload));
    
    const {
      scrubbed_metadata: {
        correlation_id: recare_call_token,
        surrogate_person_id: patient_id,
        tenant_id
      }
    } = payload.call;
    console.log('WEBHOOK_EVENT', payload.event, tenant_id, patient_id);
    console.log('CALL_TOKEN', recare_call_token);
    const idempotencyKey = `${recare_call_token}_${payload.event}`;
    if (payload.event === "call_analyzed") {
      await client.query('BEGIN');

      // Check if already processed
      const existing = await client.query(
        `
        SELECT 1 FROM app.mapping_events
        WHERE event_payload->>'idempotency_key' = $1
        `,
        [idempotencyKey]
      );
      console.log('MAPPING_EVENTS_COUNT', existing.rowCount);
      if (existing.rowCount > 0) {
        await client.query('ROLLBACK');
        return false; // Idempotent ignore
      }

      // Store raw event
      await client.query(
        `
        INSERT INTO app.mapping_events
        (event_id, tenant_id, patient_id, modality, event_payload, created_at)
        VALUES (gen_random_uuid(), $2, $3, 'calling', $1, now())
        `,
        [JSON.stringify({ ...payload, idempotency_key: idempotencyKey }, tenant_id, patient_id)]
      );
      console.log('MAPPING_DATA_INSERTED');
      await client.query('COMMIT');

      // Continue business logic outside transaction
      await finalizeAttemptAndUpdateState(payload);
      await forwardToIngestion(payload);
    }else {
      console.log('SKIPPING_EVENT', payload.event);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('WEBHOOK_PROCESS_FAILED', err.message);
  } finally {
    client.release();
  }
}

module.exports = { processWebhook };