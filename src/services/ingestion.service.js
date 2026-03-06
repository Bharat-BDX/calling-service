const axios = require("axios");

const INGESTION_ENDPOINT = process.env.INGESTION_ENDPOINT || 'https://recare-landing-dev-m3vbybnpwq-uc.a.run.app/ingest';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjI1MDdmNTFhZjJhMTYyNDY3MDc0ODQ2NzRhNDJhZTNjMmI2MjMxOWMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzMjU1NTk0MDU1OS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsImF1ZCI6IjMyNTU1OTQwNTU5LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwic3ViIjoiMTA0MzY1NzE3MTYzNTgyMjkzODk1IiwiaGQiOiJyZWNhcmUuYWkiLCJlbWFpbCI6ImJoYXJhdEByZWNhcmUuYWkiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6IkJqQV9pMXYxUXVZZVFYUkdSQjYzS2ciLCJpYXQiOjE3NzI3OTMxMDEsImV4cCI6MTc3Mjc5NjcwMX0.ERq3k1cUDxh2hm9Lt7EBIZCyUdvaESEwpaieHuEz5BsZQjHPeN9ucASRl4LTpdLf0lqPMKVTDNFaxLnHyXTQf1CA4CsZssKECfv--b3dPrbwILtTpb25Arks-4kmJbyBBCDWFksbZ98x9hijKt69WH-6UITAg0ZLc6LSzKK6yWEOb_H7ywgzo7Ax1heXJCIE9K7Q4pQ4FTM2NG82_PzwSV_5UNEqxiv1-O-VOUiZy-rmgQBS5EaVo_iVW4_gJzXptr0LXbS71N6jDMFkTqkX16ZiFT-W-KrgVZQ1f7ukR1_SCpDq1Oxj2XyZZg_sgHjXm2-wVJQPT7jip4cXUGFpSQ';
const MAX_RETRIES = 3;

function log(level, message, meta = {}) {
  console[level](
    JSON.stringify({
      service: "calling-service",
      component: "ingestion-forwarder",
      level,
      message,
      ...meta,
      timestamp: new Date().toISOString()
    })
  );
}

/**
 * Normalize webhook payload
 */
async function normalizePayload(callData) {
  console.log('WEBHOOK_RESULT', callData);
  return false;
  return {
    person_id: callData.person_id,
    call_attempt_id: callData.call_attempt_id,
    agent_id: callData.agent_id,
    agent_version: callData.agent_version,

    call_started_at: callData.start_timestamp,
    call_ended_at: callData.end_timestamp,
    duration_seconds: callData.duration,

    outcome: callData.outcome,

    transcript: callData.transcript || null,
    summary: callData.summary || null
  };
}

/**
 * Forward call result to ingestion
 */
async function forwardToIngestion(callData) {
  const payload = await normalizePayload(callData);
  console.log('NORMALIZED_PAYLOD', payload);
  
  try {
      await axios.post(INGESTION_ENDPOINT, payload, {
        headers: {
          Authorization: `Bearer ${SERVICE_TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 5000
      });

      log("info", "Ingestion forward success", {
        call_attempt_id: payload.call_attempt_id,
        attempt
      });

      return true;
    } catch (err) {
      log("error", "Ingestion forward failure", {
        call_attempt_id: payload.call_attempt_id,
        attempt,
        error: err.message
      });
      await sendToDLQ(payload);
    }
}

/**
 * DLQ fallback
 */
async function sendToDLQ(payload) {
  log("error", "Sending payload to DLQ", {
    call_attempt_id: payload.call_attempt_id
  });

  // production recommended:
  // publish to PubSub topic
  // or write to retry table
}

module.exports = {
  forwardToIngestion
};