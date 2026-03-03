const pool = require('../db');

async function timestampToIsoUtcMicro(timestamp) {
  if (typeof timestamp !== "number") {
    throw new Error("Timestamp must be a number (milliseconds)");
  }

  const date = new Date(timestamp);

  if (isNaN(date.getTime())) {
    throw new Error("Invalid timestamp");
  }

  const pad = (num, size) => String(num).padStart(size, "0");

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1, 2);
  const day = pad(date.getUTCDate(), 2);
  const hours = pad(date.getUTCHours(), 2);
  const minutes = pad(date.getUTCMinutes(), 2);
  const seconds = pad(date.getUTCSeconds(), 2);

  // Convert milliseconds to microseconds (JS only has ms precision)
  const microseconds = await pad(date.getUTCMilliseconds() * 1000, 6);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${microseconds}Z`;
}

/**
 * Update call_attempts + call_state_person
 */
async function finalizeAttemptAndUpdateState(payload) {
  const client = await pool.connect();

  try {
    console.log('STATE_UPDATE', JSON.stringify(payload));

    const {
      scrubbed_metadata: {
        correlation_id: recare_call_token,
        surrogate_person_id,
      },
      batch_call_id,
      call_id: vendor_call_id,
      call_status: outcome_status,
      disconnection_reason: outcome_reason,
      start_timestamp: started_at,
      end_timestamp: ended_at,
      agent_id,
      agent_version
    } = payload.call;

    const formattedStarted_at = await timestampToIsoUtcMicro(started_at);
    console.log("FORMATTED_STARTED_AT", formattedStarted_at);
    const formattedEnded_at = await timestampToIsoUtcMicro(ended_at);
    console.log("FORMATTED_ENDED_AT", formattedEnded_at);

    await client.query('BEGIN');

    if (payload.event === "call_analyzed") {
      // Update call_attempt
      const updateOnCallEnd = [
        vendor_call_id, agent_id, agent_version, formattedStarted_at, formattedEnded_at, outcome_status, outcome_reason, batch_call_id, recare_call_token, surrogate_person_id
      ];
    
      console.log('CALL_ANALYSING', JSON.stringify(updateOnCallEnd));

      const updateRes = await client.query(
        `
          UPDATE app.call_attempts
          SET
            vendor_call_id = $1,
            agent_id = $2,
            agent_version = $3,
            started_at = $4,
            ended_at = $5,
            outcome_status = $6,
            outcome_reason = $7,
            batch_call_id = $8
          WHERE recare_call_token = $9 AND surrogate_person_id = $10
          RETURNING call_attempt_id
        `,
        updateOnCallEnd
      );

      console.log('DB_UPDATE_RESPONSE', JSON.stringify(updateRes));

      if (updateRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return;
      }

      console.log('SCRUBBED_CALL_ANALYSIS', JSON.stringify(payload.call.scrubbed_call_analysis));

      await client.query('COMMIT');

    } else if (payload.event === "call_ended") {
      console.log('ON call_ended EVENT WE ARE NOT UPDATING ANYTHING...');
    }else {
      console.log('skipping event', payload.event);
      
    }

    // // Update call_attempt
    // const updateRes = await client.query(
    //   `
    //   UPDATE app.call_attempts
    //   SET
    //     vendor_call_id = $1,
    //     ended_at = now(),
    //     outcome_status = $2,
    //     outcome_reason = $3
    //   WHERE recare_call_token = $4
    //   RETURNING surrogate_person_id
    //   `,
    //   [vendor_call_id, outcome_status, outcome_reason, recare_call_token]
    // );

    // if (updateRes.rowCount === 0) {
    //   await client.query('ROLLBACK');
    //   return;
    // }

    // const surrogate_person_id = updateRes.rows[0].surrogate_person_id;

    // // Update state
    // let nextEligible = new Date();
    // let intervalHours = outcome_status === 'success' ? 72 : 24;

    // nextEligible.setHours(nextEligible.getHours() + intervalHours);

    // await client.query(
    //   `
    //   UPDATE app.call_state_person
    //   SET
    //     last_ended_at = now(),
    //     last_outcome = $1,
    //     next_eligible_at = $2,
    //     fail_count =
    //       CASE WHEN $1 = 'success' THEN 0
    //            ELSE fail_count + 1
    //       END,
    //     unreachable =
    //       CASE WHEN fail_count + 1 >= 4 AND $1 != 'success'
    //            THEN true
    //            ELSE false
    //       END
    //   WHERE surrogate_person_id = $3
    //   `,
    //   [outcome_status, nextEligible, surrogate_person_id]
    // );

    // await client.query('COMMIT');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('STATE_UPDATE_FAILED', err.message);
  } finally {
    client.release();
  }
}

module.exports = { finalizeAttemptAndUpdateState };