/* eslint-disable */
require('dotenv').config();
const { Pool } = require('pg');

function normalizePostgresUrl(input) {
  if (!input) return "";
  let s = input.trim();
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

// Index creation statements from migration 0006 (only indexes, not table creation)
const indexes = [
  { name: 'call_logs_tenant_idx', sql: 'CREATE INDEX IF NOT EXISTS "call_logs_tenant_idx" ON "call_logs" USING btree ("tenant_id");' },
  { name: 'call_logs_lead_phone_idx', sql: 'CREATE INDEX IF NOT EXISTS "call_logs_lead_phone_idx" ON "call_logs" USING btree ("lead_phone");' },
  { name: 'call_logs_salesperson_idx', sql: 'CREATE INDEX IF NOT EXISTS "call_logs_salesperson_idx" ON "call_logs" USING btree ("salesperson_id");' },
  { name: 'call_logs_started_at_idx', sql: 'CREATE INDEX IF NOT EXISTS "call_logs_started_at_idx" ON "call_logs" USING btree ("started_at");' },
  { name: 'call_logs_created_at_idx', sql: 'CREATE INDEX IF NOT EXISTS "call_logs_created_at_idx" ON "call_logs" USING btree ("created_at");' },
  { name: 'call_logs_completed_idx', sql: 'CREATE INDEX IF NOT EXISTS "call_logs_completed_idx" ON "call_logs" USING btree ("completed");' },
  { name: 'leads_tenant_idx', sql: 'CREATE INDEX IF NOT EXISTS "leads_tenant_idx" ON "leads" USING btree ("tenant_id");' },
  { name: 'leads_owner_idx', sql: 'CREATE INDEX IF NOT EXISTS "leads_owner_idx" ON "leads" USING btree ("owner_id");' },
  { name: 'leads_stage_idx', sql: 'CREATE INDEX IF NOT EXISTS "leads_stage_idx" ON "leads" USING btree ("stage");' },
  { name: 'leads_created_at_idx', sql: 'CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads" USING btree ("created_at");' },
  { name: 'leads_updated_at_idx', sql: 'CREATE INDEX IF NOT EXISTS "leads_updated_at_idx" ON "leads" USING btree ("updated_at");' },
  { name: 'leads_last_activity_idx', sql: 'CREATE INDEX IF NOT EXISTS "leads_last_activity_idx" ON "leads" USING btree ("last_activity_at");' },
  { name: 'leads_followup_idx', sql: 'CREATE INDEX IF NOT EXISTS "leads_followup_idx" ON "leads" USING btree ("need_followup","followup_date");' },
  { name: 'tasks_tenant_idx', sql: 'CREATE INDEX IF NOT EXISTS "tasks_tenant_idx" ON "tasks" USING btree ("tenant_id");' },
  { name: 'tasks_owner_idx', sql: 'CREATE INDEX IF NOT EXISTS "tasks_owner_idx" ON "tasks" USING btree ("owner_id");' },
  { name: 'tasks_status_idx', sql: 'CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks" USING btree ("status");' },
  { name: 'tasks_due_at_idx', sql: 'CREATE INDEX IF NOT EXISTS "tasks_due_at_idx" ON "tasks" USING btree ("due_at");' },
  { name: 'tasks_lead_phone_idx', sql: 'CREATE INDEX IF NOT EXISTS "tasks_lead_phone_idx" ON "tasks" USING btree ("lead_phone");' },
  { name: 'tasks_created_at_idx', sql: 'CREATE INDEX IF NOT EXISTS "tasks_created_at_idx" ON "tasks" USING btree ("created_at");' },
];

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

    console.log('Applying performance indexes...');
    let created = 0;
    let skipped = 0;
    
    for (const index of indexes) {
      try {
        await pool.query(index.sql);
        created++;
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        if (error.code === '42P07' || error.message?.includes('already exists')) {
          skipped++;
          console.log(`⏭️  Index already exists: ${index.name}`);
        } else {
          console.error(`❌ Failed to create index ${index.name}:`, error.message);
        }
      }
    }
    
    console.log(`\n✅ Index application complete! Created: ${created}, Skipped: ${skipped}`);

    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
})();

