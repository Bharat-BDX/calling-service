const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const { normalizeAndHashPhone } = require('../utils/phone.util');

async function initiateCall(candidate, tenantId) {
  console.log("CALL_INITIATE", JSON.stringify(candidate));
  
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Set tenant context
    await client.query(
      "SELECT set_config('app.current_tenant', $1, true)",
      [tenantId]
    );

    const { metadata, to_number } = candidate;
    const { surrogate_person_id} = metadata;
    console.log('RAW_PHONE', to_number);
    
    const phone_hash = to_number ? normalizeAndHashPhone(to_number) : null;
    console.log('PHONE_HASH', phone_hash);
    
    if (!phone_hash) {
      await client.query('ROLLBACK');
      return null; // Never call blank phone
    }

    /**
     * STEP 1 — Validate calling window
     */

    const windowRes = await client.query(
      `
      SELECT *
      FROM app.calling_windows
      WHERE tenant_id = current_setting('app.current_tenant', true)
        AND timezone = $1
        AND now()::time BETWEEN start_time AND end_time
        AND extract(dow from now()) = ANY(allowed_days)
      LIMIT 1
      `,
      [timezone]
    );

    if (windowRes.rowCount === 0) {
      console.log("OUTSIDE_CALLING_WINDOW");
      await client.query('ROLLBACK');
      return null;
    }

    /**
     * STEP 2 — PHONE LEVEL LOCK
     */

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      [phone_hash]
    );

    /**
     * STEP 3 — cooldown calculation
     */
    const cooldownRes = await client.query(`
      SELECT
        MAX(initiated_at) FILTER (WHERE outcome_status IS NULL) AS last_initiated,
        MAX(ended_at) FILTER (WHERE outcome_status = 'ended') AS last_success
      FROM app.call_attempts
      WHERE phone_hash = $1
        AND tenant_id = current_setting('app.current_tenant', true)
    `, [phone_hash]);

    const stateRes = await client.query(
      `
      SELECT next_eligible_at
      FROM app.call_state_person
      WHERE surrogate_person_id = $1
      `,
      [surrogate_person_id]
    );

    const now = new Date();

    const lastInitiated = cooldownRes.rows[0].last_initiated;
    const lastSuccess = cooldownRes.rows[0].last_success;
    const nextEligible = stateRes.rows[0]?.next_eligible_at;

    let cooldownUntil = null;

    if (lastInitiated) {
      const d = new Date(lastInitiated);
      d.setHours(d.getHours() + 24);
      cooldownUntil = d;
    }

    if (lastSuccess) {
      const d = new Date(lastSuccess);
      d.setHours(d.getHours() + 72);
      if (!cooldownUntil || d > cooldownUntil) cooldownUntil = d;
    }

    if (nextEligible) {
      const d = new Date(nextEligible);
      if (!cooldownUntil || d > cooldownUntil) cooldownUntil = d;
    }

    if (cooldownUntil && now < cooldownUntil) {
      await client.query('ROLLBACK');
      return null; // Abort safely
    }

    /**
     * STEP 4 — create call attempt
     */
    const callAttemptId = uuidv4();
    const token = uuidv4();

    await client.query(`
      INSERT INTO app.call_attempts (
        call_attempt_id,
        tenant_id,
        recare_call_token,
        surrogate_person_id,
        phone_hash,
        initiated_at,
        outcome_status
      )
      VALUES ($1,$2,$3,$4,$5,now(),'initiated')
      RETURNING call_attempt_id
    `, [
      callAttemptId,
      tenantId,
      token,
      surrogate_person_id,
      phone_hash
    ]);

    await client.query('COMMIT');
    candidate.metadata.tenant_id = tenantId
    candidate.metadata.correlation_id = token;
    return candidate;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('atomic_initiate_failed', err.message);
    return null;
  } finally {
    client.release();
  }
}

module.exports = { initiateCall };