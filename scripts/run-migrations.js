/* eslint-disable */
require('dotenv').config();
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');

(async () => {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error('DATABASE_URL is not set');
      process.exit(1);
    }
    const hostname = new URL(url).hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    const pool = new Pool({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } });
    const db = drizzle(pool);

    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations applied successfully.');

    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Migration error:', e);
    process.exit(1);
  }
})(); 