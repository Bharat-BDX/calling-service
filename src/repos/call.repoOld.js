const pool = require('../db');
const { v4: uuidv4 } = require('uuid');

async function initiateCall(candidate, tenantId) {

  const client = await pool.connect();

  try {
    console.log('call_initiating_for', candidate.surrogate_person_id);
    await client.query('BEGIN');
    await client.query(
      "SELECT set_config('app.current_tenant', $1, true)",
      [tenantId]
    );
    // await client.query(
    //   `SET LOCAL app.current_tenant = '${tenantId.replace(/'/g, "''")}'`
    // );
    // await client.query(
    //   `SELECT set_config('app.current_tenant_id', $1, true)`,
    //   [tenantId]
    // );
    // 1️⃣ Acquire phone-level advisory lock
    // await client.query(
    //   `SELECT pg_advisory_xact_lock(hashtext($1))`,
    //   [candidate.surrogate_person_id]
    // );

    // 2️⃣ Check cooldown
    // const cooldownRes = await client.query(`
    //   SELECT MAX(initiated_at) as last_init
    //   FROM app.call_attempts
    //   WHERE phone_hash = $1
    // `, [candidate.phone_hash]);

    // if (cooldownRes.rows[0].last_init) {
    //   const last = new Date(cooldownRes.rows[0].last_init);
    //   const diff = Date.now() - last.getTime();

    //   if (diff < 24 * 60 * 60 * 1000) {
    //     await client.query('ROLLBACK');
    //     return null;
    //   }
    // }

    // 3️⃣ Insert initiated record
    const token = uuidv4();

    const insertRes = await client.query(`
      INSERT INTO app.call_attempts
      (call_attempt_id, tenant_id, recare_call_token, surrogate_person_id, phone_hash,
       agent_id, agent_version, initiated_at)
      VALUES ($1, $2, $3, $4, $5, 'default-agent', 'v1', now())
      RETURNING call_attempt_id
    `, [
      token,
      tenantId,
      token,
      candidate.surrogate_person_id,
      'e896-4a24-8798'
    ]);

    await client.query('COMMIT');
    console.log('[inserting_call_attempt');
    return insertRes.rows[0];
    // return {
    //   call_attempt_id: insertRes.rows[0].call_attempt_id,
    //   recare_call_token: token
    // };

  } catch (err) {
    console.error('call_insert_failed', err.message);
    await client.query('ROLLBACK');
    return null;
  } finally {
    client.release();
  }
}

module.exports = { initiateCall };
