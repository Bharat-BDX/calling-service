require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
  ssl: false,

  // REQUIRED FOR CLOUD RUN
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('connect', async (client) => {
  // Defensive default — overridden per request
  await client.query(`SET app.current_tenant = ''`);
});

// HARD DIAGNOSTIC (keep for now)
pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

module.exports = pool;