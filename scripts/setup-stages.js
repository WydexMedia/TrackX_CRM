#!/usr/bin/env node
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

async function setupStages() {
  const raw = process.env.PSQL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  const url = normalizePostgresUrl(raw);
  
  if (!url || !/^postgres(?:ql)?:\/\//i.test(url)) {
    console.error('❌ Invalid Postgres connection string');
    process.exit(1);
  }

  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  
  const ssl = isLocal ? false : { rejectUnauthorized: false };
  
  const pool = new Pool({
    connectionString: sanitizeUrl(url),
    ssl
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected successfully!\n');

    // Step 1: Create table if not exists
    console.log('Step 1: Creating lead_stages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "lead_stages" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" varchar(64) NOT NULL,
        "color" varchar(32) DEFAULT 'slate' NOT NULL,
        "order" integer DEFAULT 0 NOT NULL,
        "is_default" boolean DEFAULT false,
        "tenant_id" integer,
        "created_at" timestamp with time zone DEFAULT now(),
        "updated_at" timestamp with time zone DEFAULT now()
      )
    `);
    console.log('✓ Table created/verified\n');

    // Step 2: Create unique index
    console.log('Step 2: Creating unique index...');
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "stage_tenant_name_idx" 
      ON "lead_stages" ("tenant_id", "name")
    `);
    console.log('✓ Index created/verified\n');

    // Step 3: Seed default stages for tenant 2 (proskill)
    console.log('Step 3: Seeding default stages for tenant ID 2 (proskill)...');

    const stages = [
      { name: 'Not contacted', color: 'gray', order: 1, isDefault: true },
      { name: 'Attempt to contact', color: 'yellow', order: 2, isDefault: true },
      { name: 'Did not Connect', color: 'red', order: 3, isDefault: true },
      { name: 'Qualified', color: 'green', order: 4, isDefault: true },
      { name: 'Not interested', color: 'red', order: 5, isDefault: true },
      { name: 'Interested', color: 'blue', order: 6, isDefault: true },
      { name: 'To be nurtured', color: 'cyan', order: 7, isDefault: true },
      { name: 'Junk', color: 'red', order: 8, isDefault: true },
      { name: 'Ask to call back', color: 'amber', order: 9, isDefault: true },
      { name: 'Customer', color: 'emerald', order: 10, isDefault: true },
      { name: 'Other Language', color: 'purple', order: 11, isDefault: true },
    ];

    for (const stage of stages) {
      const query = `
        INSERT INTO lead_stages (name, color, "order", is_default, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 2, NOW(), NOW())
        ON CONFLICT (tenant_id, name) DO UPDATE
        SET color = EXCLUDED.color,
            "order" = EXCLUDED."order",
            is_default = EXCLUDED.is_default,
            updated_at = NOW()
        RETURNING id, name
      `;

      const result = await client.query(query, [stage.name, stage.color, stage.order, stage.isDefault]);
      console.log(`  ✓ ${stage.name} (${stage.color}) - ID: ${result.rows[0].id}`);
    }

    // Verify the data
    console.log('\nStep 4: Verifying seeded data...');
    const verification = await client.query(
      'SELECT COUNT(*) as count FROM lead_stages WHERE tenant_id = 2'
    );
    console.log(`✓ Total stages for tenant 2: ${verification.rows[0].count}\n`);

    client.release();
    console.log('✅ Successfully set up stages for proskill tenant (ID: 2)!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

setupStages()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

