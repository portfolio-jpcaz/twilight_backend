// db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // ex: ...supabase.co:5432/postgres?sslmode=require
  ssl: {
    require: true,              // force TLS
    rejectUnauthorized: false,  // n'exige pas un CA public (cert Supabase ok)
  },
});

pool.on('connect', () => console.log('✅ PG pool connected'));
pool.on('error', (e) => console.error('PG pool error', e));

module.exports = pool;

