// const axios = require('axios');

/**
 * Task-62:
 * Forward call results to ingestion service.
 */
async function forwardToIngestion(payload) {
  try {
    // await axios.post(
    //   process.env.INGESTION_URL,
    //   payload,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.INGESTION_TOKEN}`
    //     }
    //   }
    // );
  } catch (err) {
    console.error('INGESTION_FORWARD_FAILED', err.message);
  }
}

module.exports = { forwardToIngestion };