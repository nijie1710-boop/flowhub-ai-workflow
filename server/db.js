const { Pool } = require('pg');

try {
  require('dotenv').config();
} catch {
  // dotenv is optional in production when env vars are injected by the host.
}

const max = parseInt(process.env.DB_POOL_MAX || '10', 10);
const idleTimeoutMillis = parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10);

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max,
      idleTimeoutMillis
    }
  : {
      host: process.env.DB_HOST || process.env.PGHOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
      database: process.env.DB_NAME || process.env.PGDATABASE || 'flowhub',
      user: process.env.DB_USER || process.env.PGUSER || 'flowhub_app',
      password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
      max,
      idleTimeoutMillis
    };

if (!process.env.DATABASE_URL && !poolConfig.password) {
  console.warn('DB_PASSWORD/PGPASSWORD is not set; database authentication may fail.');
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

module.exports = pool;
