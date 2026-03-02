const pool = require('../db');

/**
 * Task-10:
 * Update call_attempts + call_state_person
 */
async function finalizeAttemptAndUpdateState(payload) {
  const client = await pool.connect();

  try {
    console.log('STATE_UPDATE', JSON.stringify(payload));
    await client.query('BEGIN');

    const {
      recare_call_token,
      vendor_call_id,
      outcome_status,
      outcome_reason
    } = payload;

    // Update call_attempt
    const updateRes = await client.query(
      `
      UPDATE app.call_attempts
      SET
        vendor_call_id = $1,
        ended_at = now(),
        outcome_status = $2,
        outcome_reason = $3
      WHERE recare_call_token = $4
      RETURNING surrogate_person_id
      `,
      [vendor_call_id, outcome_status, outcome_reason, recare_call_token]
    );

    if (updateRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return;
    }

    const surrogate_person_id = updateRes.rows[0].surrogate_person_id;

    // Update state
    let nextEligible = new Date();
    let intervalHours = outcome_status === 'success' ? 72 : 24;

    nextEligible.setHours(nextEligible.getHours() + intervalHours);

    await client.query(
      `
      UPDATE app.call_state_person
      SET
        last_ended_at = now(),
        last_outcome = $1,
        next_eligible_at = $2,
        fail_count =
          CASE WHEN $1 = 'success' THEN 0
               ELSE fail_count + 1
          END,
        unreachable =
          CASE WHEN fail_count + 1 >= 4 AND $1 != 'success'
               THEN true
               ELSE false
          END
      WHERE surrogate_person_id = $3
      `,
      [outcome_status, nextEligible, surrogate_person_id]
    );

    await client.query('COMMIT');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('STATE_UPDATE_FAILED', err.message);
  } finally {
    client.release();
  }
}

module.exports = { finalizeAttemptAndUpdateState };