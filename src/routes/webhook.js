const express = require('express');
const { Retell } = require('retell-sdk');
const router = express.Router();
// const rawBodyMiddleware = require('../middlewares/raw-body.middleware');
// const { verifySignature } = require('../utils/signature.util');
const { processWebhook } = require('../services/webhook.service');

router.post('/retell', async (req, res) => {
  // router.post('/retell', rawBodyMiddleware, async (req, res) => {
    // const signature = req.headers['x-retell-signature'];
    // console.log("WEBHOOK_SIGN", signature);
    
    // const verifyRetellSign = await verifySignature(req.rawBody, signature);
    // console.log("VERIFY_SIGN", verifyRetellSign);
    try {
        console.log("CALLING_WEBHOOK");
        
        const verifyRetellSignatureRes = await Retell.verify(
            JSON.stringify(req.body),
            'key_042baf5bb48a6fedc4f39a789d34',
            req.headers["x-retell-signature"]
        );

        console.log('RETELL_WEBHOOK_SECRET', process.env.RETELL_WEBHOOK_SECRET);
        console.log('RAW_BODY', req.rawBody);

        console.log('VERIFY_RETELL_SIGNATURE_RESPONSE', verifyRetellSignatureRes);
    
        if (!verifyRetellSignatureRes) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
        console.log("WEBHOOK_PAYLOAD", JSON.stringify(req.body));
        
        // const payload = JSON.parse(req.body);
        const payload = req.body;
        await processWebhook(payload);

        res.status(200).json({ ok: true, message: "Webhook processed successfully" });
    } catch (error) {
        console.error('RETELL_SIGNATURE_VERIFICATION_FAILED', error);
        throw error;
    }
  }
);

module.exports = router;