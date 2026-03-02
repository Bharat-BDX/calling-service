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
    const { surrogate_person_id, correlation_id: token} = metadata;
    const rawPhone = to_number; // TODO: inject from vendor
    const phone_hash = rawPhone ? normalizeAndHashPhone(rawPhone) : null;
    // if (!phone_hash) {
    //   await client.query('ROLLBACK');
    //   return null; // Never call blank phone
    // }

    // // PHONE-LEVEL ATOMIC LOCK
    // await client.query(
    //   `SELECT pg_advisory_xact_lock(hashtext($1))`,
    //   [phone_hash]
    // );

    // -------------------------
    // COOLDOWN CALCULATION
    // -------------------------

    // const cooldownRes = await client.query(`
    //   SELECT
    //     MAX(initiated_at) FILTER (WHERE outcome_status IS NULL) AS last_initiated,
    //     MAX(ended_at) FILTER (WHERE outcome_status = 'success') AS last_success
    //   FROM app.call_attempts
    //   WHERE phone_hash = $1
    //     AND tenant_id = current_setting('app.current_tenant', true)
    // `, [phone_hash]);

    // const stateRes = await client.query(`
    //   SELECT next_eligible_at
    //   FROM app.call_state_person
    //   WHERE surrogate_person_id = $1
    // `, [surrogate_person_id]);

    // const now = new Date();

    // const lastInitiated = cooldownRes.rows[0].last_initiated;
    // const lastSuccess = cooldownRes.rows[0].last_success;
    // const nextEligible = stateRes.rows[0]?.next_eligible_at;

    // let cooldownUntil = null;

    // if (lastInitiated) {
    //   const d = new Date(lastInitiated);
    //   d.setHours(d.getHours() + 24);
    //   cooldownUntil = d;
    // }

    // if (lastSuccess) {
    //   const d = new Date(lastSuccess);
    //   d.setHours(d.getHours() + 72);
    //   if (!cooldownUntil || d > cooldownUntil) cooldownUntil = d;
    // }

    // if (nextEligible) {
    //   const d = new Date(nextEligible);
    //   if (!cooldownUntil || d > cooldownUntil) cooldownUntil = d;
    // }

    // if (cooldownUntil && now < cooldownUntil) {
    //   await client.query('ROLLBACK');
    //   return null; // Abort safely
    // }

    // -------------------------
    // SAFE INSERT
    // -------------------------

    const callAttemptId = uuidv4();
    // const token = uuidv4();

    const insertRes = await client.query(`
      INSERT INTO app.call_attempts (
        call_attempt_id,
        tenant_id,
        recare_call_token,
        surrogate_person_id,
        phone_hash,
        agent_id,
        agent_version,
        initiated_at,
        outcome_status
      )
      VALUES ($1,$2,$3,$4,$5,'default-agent','v1',now(),'initiated')
      RETURNING call_attempt_id
    `, [
      callAttemptId,
      tenantId,
      token,
      surrogate_person_id,
      phone_hash
    ]);

    await client.query('COMMIT');

    // return insertRes.rows[0];
    return { call_attempt_id: callAttemptId };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('atomic_initiate_failed', err.message);
    return null;
  } finally {
    client.release();
  }
}

module.exports = { initiateCall };