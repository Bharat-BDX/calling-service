const pool = require('../db');
// const { normalizeAndHashPhone } = require('../utils/phone.util');

async function getEligibleCandidates(timezone, tenantId) {

  const client = await pool.connect();

  try {
    console.log('GET_ELIGIBILITY', tenantId, timezone);
    // await client.query('BEGIN');
    // Set tenant context (RLS)
    // await client.query(
    //   "SET LOCAL app.current_tenant = $1",
    //   [tenantId]
    // );

    // force BEGIN so SET LOCAL actually applies
    await client.query('BEGIN');
    await client.query(
      "SELECT set_config('app.current_tenant', $1, true)",
      [tenantId]
    );
    // await client.query(
    //   `SET LOCAL app.current_tenant = '${tenantId.replace(/'/g, "''")}'`
    // );

    // PROVE what PostgreSQL sees
    // const tenantCheck = await client.query(
    //   "SELECT current_setting('app.current_tenant', true) AS tenant"
    // );
    // console.log('DB_CURRENT_TENANT', tenantCheck.rows[0].tenant);
    
    const windowResult = await client.query( // Need to remove, using for testing purpose
      `
      SELECT tenant_id
      FROM app.calling_windows
      WHERE timezone = $1
      `,
      [timezone]
    );
    console.log('RAW_CALLING_WINDOWS', windowResult.rows);

    // ✅ calling_windows MUST include tenant
    const windowRes = await client.query(
      `
      SELECT 1
      FROM app.calling_windows
      WHERE timezone = $1
        AND tenant_id = current_setting('app.current_tenant', true)
        AND now()::time BETWEEN start_time AND end_time
      LIMIT 1
      `,
      [timezone]
    );
    
    console.log('calling_windows_rows', windowRes.rows);
    console.log('calling_windows_count', windowRes.rows.length, windowRes.rowCount);
    if (windowRes.rows.length === 0) {
      return [];
    }

    // 2️⃣ Load patients in timezone
    // const patients = await client.query(`
    //   SELECT p.id, p.phone, p.do_not_call, p.calling_opt_in,
    //          cs.next_eligible_at, cs.unreachable
    //   FROM app.patient p
    //   LEFT JOIN app.call_state_person cs
    //     ON cs.surrogate_person_id = p.id
    //   WHERE p.timezone = $1
    // `, [timezone]);

    // const now = new Date();
    // const eligible = [];

    // for (let p of patients.rows) {

    //   if (p.do_not_call) continue;
    //   if (!p.calling_opt_in) continue;
    //   if (p.unreachable) continue;

    //   const phoneHash = normalizeAndHashPhone(p.phone);
    //   if (!phoneHash) continue;

    //   if (p.next_eligible_at && now < p.next_eligible_at) continue;

    //   eligible.push({
    //     surrogate_person_id: p.id,
    //     phone_hash: phoneHash
    //   });
    // }

    // return eligible;

    // const res = await client.query(`
    //   SELECT p.patient_id AS surrogate_person_id, p.timezone,
    //          cs.next_eligible_at, cs.unreachable
    //   FROM app.patient p
    //   LEFT JOIN app.call_state_person cs
    //     ON cs.surrogate_person_id = p.patient_id
    //   WHERE p.timezone = $1
    //     AND p.calling_opt_in = true
    //     AND p.do_not_call = false 
    // `, [timezone]);

    // ✅ patient query already RLS-safe
    // const res = await client.query(
    //   `
    //   SELECT
    //     p.patient_id AS surrogate_person_id
    //   FROM app.patient p
    //   LEFT JOIN app.call_state_person cs
    //     ON cs.surrogate_person_id = p.patient_id
    //   WHERE p.timezone = $1
    //     AND p.calling_opt_in = true
    //     AND p.do_not_call = false
    //     AND (cs.unreachable IS NULL OR cs.unreachable = false)
    //     AND (cs.next_eligible_at IS NULL OR cs.next_eligible_at <= now())
    //   `,
    //   [timezone]
    // );

    // const checkTenant = await client.query(
    //   "SELECT current_setting('app.current_tenant', true) AS tenant"
    // );
    // console.log('DB_TENANT_BEFORE', checkTenant.rows[0].tenant);
    // const res = await client.query(
    //   `
    //   SELECT p.patient_id AS surrogate_person_id
    //   FROM app.patient p
    //   WHERE p.timezone = $1
    //     AND p.calling_opt_in = true
    //     AND p.do_not_call = false
    //   `,
    //   [timezone]
    // );

    /**
     * 
     * - only opted-in
     * - not do_not_call
     * - reachable
     * - next_eligible_at satisfied
     */
    const res = await client.query(
      `
      SELECT
        p.patient_id AS surrogate_person_id
      FROM app.patient p
      LEFT JOIN app.call_state_person cs
        ON cs.surrogate_person_id = p.patient_id
      WHERE p.timezone = $1
        AND p.calling_opt_in = true
        AND p.do_not_call = false
        AND (cs.unreachable IS NULL OR cs.unreachable = false)
        AND (cs.next_eligible_at IS NULL OR cs.next_eligible_at <= now())
      `,
      [timezone]
    );
    await client.query('COMMIT');
    console.log('patients', res.rows);
    const check_Tenant = await client.query(
      "SELECT current_setting('app.current_tenant', true) AS tenant"
    );
    console.log('DB_TENANT_AFTER', check_Tenant.rows[0].tenant);
    return res.rows;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { getEligibleCandidates };
