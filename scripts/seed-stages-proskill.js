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

async function seedStagesForProskill() {
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

    console.log('Seeding default stages for tenant ID 2 (proskill)...');

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
        INSERT INTO lead_stages (name, color, "order", is_default, tenant_id)
        VALUES ($1, $2, $3, $4, 2)
        ON CONFLICT (tenant_id, name) DO UPDATE
        SET color = EXCLUDED.color,
            "order" = EXCLUDED."order",
            is_default = EXCLUDED.is_default,
            updated_at = NOW()
      `;

      await client.query(query, [stage.name, stage.color, stage.order, stage.isDefault]);
      console.log(`✓ Seeded stage: ${stage.name} (${stage.color})`);
    }

    client.release();
    console.log('\n✅ Successfully seeded all default stages for proskill tenant (ID: 2)!');
    console.log(`Total stages: ${stages.length}`);

  } catch (error) {
    console.error('❌ Error seeding stages:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedStagesForProskill()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });

