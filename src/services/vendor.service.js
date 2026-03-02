// const axios = require('axios');

async function triggerOutboundCall(payload) {
  try {
    console.log("OUTBOUND_CALL_PAYLOD", payload);
    // await axios.post(process.env.VENDOR_URL, payload, {
    //   headers: {
    //     Authorization: `Bearer ${process.env.VENDOR_API_KEY}`
    //   }
    // });

    return true;
  } catch (err) {
    console.error('vendor_call_failed', err.message);
    return false; // Never retry automatically
  }
}

module.exports = { triggerOutboundCall };