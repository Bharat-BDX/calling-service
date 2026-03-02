const express = require('express');
const schedulerRoutes = require('./routes/scheduler');
const eligibilityRoutes = require('./routes/eligibility');
const tenantMiddleware = require('./middlewares/tenant.middleware');
const webhookRoutes = require('./routes/webhook');

const pool = require('./db');

const app = express();
app.use(express.json());

app.use('/scheduler', tenantMiddleware, schedulerRoutes);
app.use('/eligibility', tenantMiddleware, eligibilityRoutes);
app.use('/webhooks', webhookRoutes);
app.get('/health', (req, res) => res.send('OK'));

app.get('/db-health', async (req, res) => {
  try {
    const r = await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    console.error("DB_CONNECTION_ERROR", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Calling service running on ${PORT}`));
