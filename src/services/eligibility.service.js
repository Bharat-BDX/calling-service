const pool = require('../db');
// const { normalizeAndHashPhone } = require('../utils/phone.util');

async function getEligibleCandidates(timezone, tenantId) {

  // const client = await pool.connect();

  try {
    console.log('GET_ELIGIBILITY', tenantId, timezone);

    // // force BEGIN so SET LOCAL actually applies
    // await client.query('BEGIN');
    // await client.query(
    //   "SELECT set_config('app.current_tenant', $1, true)",
    //   [tenantId]
    // );

    // // Validate calling window
    // const windowRes = await client.query(
    //   `
    //   SELECT *
    //   FROM app.calling_windows
    //   WHERE tenant_id = current_setting('app.current_tenant', true)
    //     AND timezone = $1
    //     AND now()::time BETWEEN start_time AND end_time
    //     AND extract(dow from now()) = ANY(allowed_days)
    //   LIMIT 1
    //   `,
    //   [timezone]
    // );
    
    // console.log('calling_windows_count', windowRes?.rows.length, windowRes.rowCount);
    // if (windowRes.rowCount === 0) {
    //   return [];
    // }

    // /**
    //  * 
    //  * - only opted-in
    //  * - not do_not_call
    //  * - reachable
    //  * - next_eligible_at satisfied
    //  */
    // const res = await client.query(
    //   `
    //   SELECT
    //   p.patient_id AS surrogate_person_id,
    //   FROM app.patient p
    //   LEFT JOIN app.call_state_person cs
    //     ON cs.surrogate_person_id = p.patient_id
    //   WHERE p.timezone = $1
    //     AND p.tenant_id = $2
    //     AND p.calling_opt_in = true
    //     AND p.do_not_call = false
    //     AND (cs.unreachable IS NULL OR cs.unreachable = false)
    //     AND (cs.next_eligible_at IS NULL OR cs.next_eligible_at <= now())
    //   `,
    //   [timezone, tenantId]
    // );

    // await client.query('COMMIT');
    // console.log('PATIEN_LIST', JSON.stringify(res.rows));
    
    // return res.rows;

    const validItems = [
        {
            "to_number":"+917000109067",
            "metadata": { 
                "patient_name":"Bharat Namdev",
                "surrogate_person_id":"9cc5d855-e896-4a24-8798-3fb54b89a302"
            }
        },
        {
            "to_number":"+918982364625",
            "metadata": { 
                "patient_name":"Satyam gour",
                "surrogate_person_id":"8bb5d855-e896-4a24-8798-3fb54b89a203"
            }
        }
    ];

    return validItems;
  } catch (e) {
    // await client.query('ROLLBACK');
    throw e;
  } finally {
    // client.release();
  }
}

module.exports = { getEligibleCandidates };
