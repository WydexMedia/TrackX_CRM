/* eslint-disable */
require('dotenv').config();
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');

function normalizePostgresUrl(input) {
  if (!input) return "";
  let s = input.trim();
  // Handle values like: psql 'postgresql://user:pass@host/db?sslmode=require'
  const match = s.match(/(postgres(?:ql)?:\/\/[\w\-:@.%\/? ,=&+#]+)"?'?/i);
  if (s.startsWith("psql ") || match) {
    if (match && match[1]) return match[1];
    s = s.replace(/^psql\s+/, "").replace(/^[\'"]|[\'"]$/g, "");
  }
  return s;
}

function sanitizeUrl(input) {
  try {
    const u = new URL(input);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("ssl");
    return u.toString();
  } catch {
    return input;
  }
}

(async () => {
  try {
    const raw = process.env.PSQL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    if (!raw) {
      console.error('DATABASE_URL (or PSQL or NEON_DATABASE_URL) is not set');
      process.exit(1);
    }
    
    const url = normalizePostgresUrl(raw);
    const hostname = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return "";
      }
    })();
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // Use same SSL logic as client.ts
    const caPath = process.env.RDS_CA_BUNDLE_PATH || process.env.PGSSLROOTCERT;
    let ssl = isLocal ? false : { rejectUnauthorized: false };
    if (!isLocal && caPath) {
      try {
        const fs = require('fs');
        const ca = fs.readFileSync(caPath, "utf8");
        ssl = { ca, rejectUnauthorized: true };
      } catch {
        ssl = { rejectUnauthorized: false };
      }
    }
    
    const pool = new Pool({ 
      connectionString: sanitizeUrl(url), 
      ssl,
      max: Number(process.env.PG_MAX_POOL_SIZE || 10),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
      connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5000),
    });
    const db = drizzle(pool);

    console.log('Applying migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations applied successfully.');

    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('❌ Migration error:', e);
    process.exit(1);
  }
})(); 