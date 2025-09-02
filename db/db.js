// db.js
const { Pool } = require('pg');
try {
  console.log("DATABASE_URL: "+process.env.DATABASE_URL);
  const u = new URL(process.env.DATABASE_URL || '');
  console.log('DB URL host seen by server:', u.host);
} catch { console.log('DB URL invalid/undefined'); }

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ex: ...supabase.co:5432/postgres?sslmode=require
  ssl: {
    require: true,              // force TLS
    rejectUnauthorized: false,  // n'exige pas un CA public (cert Supabase ok)
  },
  keepAlive: true,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => console.log('✅ PG pool connected'));
pool.on('error', (e) => console.error('PG pool error', e));

module.exports = pool;

