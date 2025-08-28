/* eslint-disable */
require('dotenv').config();
const { Pool } = require('pg');

(async () => {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error('DATABASE_URL is not set');
      process.exit(1);
    }
    const dbName = process.env.DB_NAME || 'appdb';

    const hostname = new URL(url).hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const pool = new Pool({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });

    await pool.query(`CREATE DATABASE ${dbName}`);
    console.log(`Created database '${dbName}' (or it already existed).`);
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Create DB error:', e);
    process.exit(1);
  }
})(); 