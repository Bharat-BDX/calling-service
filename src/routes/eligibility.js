const express = require('express');
const router = express.Router();
const { getEligibleCandidates } = require('../services/eligibility.service');

router.post('/run', async (req, res) => {
  const { timezone, tenant_id } = req.body;
  if (!timezone) return res.status(400).json({ error: 'timezone required' });

  const candidates = await getEligibleCandidates(timezone, tenant_id);

  res.json({
    timezone,
    eligible_count: candidates.length,
    candidates
  });
});

module.exports = router;