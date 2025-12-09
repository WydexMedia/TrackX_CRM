/* eslint-disable */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
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

(async () => {
  try {
    const raw = process.env.PSQL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    const url = normalizePostgresUrl(raw);
    
    if (!url || !/^postgres(?:ql)?:\/\//i.test(url)) {
      console.error('❌ Invalid Postgres connection string. Set one of PSQL, DATABASE_URL, or NEON_DATABASE_URL');
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

    const pool = new Pool({
      connectionString: sanitizeUrl(url),
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });

    console.log('\n📋 Fetching all tenants from database...\n');
    
    // Get all tenants
    const tenantsResult = await pool.query(`
      SELECT 
        id,
        subdomain,
        name,
        metadata,
        created_at,
        updated_at
      FROM tenants
      ORDER BY created_at DESC
    `);

    const tenants = tenantsResult.rows;

    if (tenants.length === 0) {
      console.log('ℹ️  No tenants found in the database.\n');
      await pool.end();
      process.exit(0);
    }

    console.log(`✅ Found ${tenants.length} tenant(s):\n`);
    console.log('═'.repeat(100));

    // Get users for each tenant
    for (const tenant of tenants) {
      const usersResult = await pool.query(`
        SELECT 
          id,
          email,
          name,
          code,
          role,
          tenant_id
        FROM users
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `, [tenant.id]);

      const tenantUsers = usersResult.rows;

      console.log(`\n🏢 Tenant ID: ${tenant.id}`);
      console.log(`   Subdomain: ${tenant.subdomain}`);
      console.log(`   Name: ${tenant.name || 'N/A'}`);
      
      if (tenant.metadata) {
        const metadata = typeof tenant.metadata === 'string' 
          ? JSON.parse(tenant.metadata) 
          : tenant.metadata;
        
        if (metadata.email) console.log(`   Contact Email: ${metadata.email}`);
        if (metadata.contactName) console.log(`   Contact Name: ${metadata.contactName}`);
        if (metadata.phone) console.log(`   Phone: ${metadata.phone}`);
        if (metadata.industry) console.log(`   Industry: ${metadata.industry}`);
        if (metadata.expectedUsers) console.log(`   Expected Users: ${metadata.expectedUsers}`);
        if (metadata.logoPath) console.log(`   Logo: ${metadata.logoPath}`);
      }
      
      console.log(`   Created: ${new Date(tenant.created_at).toLocaleString()}`);
      console.log(`   Updated: ${new Date(tenant.updated_at).toLocaleString()}`);
      
      if (tenantUsers.length > 0) {
        console.log(`\n   👥 Users (${tenantUsers.length}):`);
        tenantUsers.forEach((user, index) => {
          console.log(`      ${index + 1}. ${user.name || 'N/A'} (${user.email})`);
          console.log(`         Role: ${user.role || 'N/A'} | Code: ${user.code || 'N/A'}`);
        });
      } else {
        console.log(`\n   ⚠️  No users assigned to this tenant yet.`);
      }
      
      console.log('─'.repeat(100));
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total Tenants: ${tenants.length}`);
    
    const totalUsers = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE tenant_id IS NOT NULL
    `);
    console.log(`   Total Users with Tenant: ${totalUsers.rows[0].count}`);
    
    const usersWithoutTenant = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE tenant_id IS NULL
    `);
    console.log(`   Users without Tenant: ${usersWithoutTenant.rows[0].count}`);
    
    console.log('\n');

    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error fetching tenants:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();


