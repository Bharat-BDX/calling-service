const express = require('express');
const router = express.Router();
const { executeBatchCall } = require('../services/retell.service');
const { getEligibleCandidates } = require('../services/eligibility.service');
const { initiateCall } = require('../repos/call.repo');

router.post('/run', async (req, res) => {

  const { timezone, max_batch_size } = req.body;
  const maxBatchSize = max_batch_size || 25;
  const tenantId = req.tenantId;
  console.log("tenantId", tenantId);
  if (!timezone) return res.status(400).json({ error: 'timezone required' });

  const candidates = await getEligibleCandidates(timezone, tenantId);
  console.log("CANDIDATES", candidates);
  const initiated = [];

  // const candidates = await executeBatchCall();
  // console.log("CANDIDATE_RESULT", JSON.stringify(candidates));
  // if (!candidates.success) {
  if (candidates.length == 0) {
    res.json({
      success: false,
      message: candidates?.message || 'No valid candidates found!'
    })
  }

  // for (let c of candidates.attemptBatchPayload.tasks) {
  for (let c of candidates) {

    if (initiated.length >= maxBatchSize) {
      console.log('MAX_BATCH_REACHED');
      break;
    } 

    const result = await initiateCall(c, tenantId);
    if (result) initiated.push(result);
  }

  if (initiated.length > 0) {
    await executeBatchCall(initiated);
  }

  res.json({
    success: true,
    timezone,
    initiated: initiated.length
  });
});

module.exports = router;
