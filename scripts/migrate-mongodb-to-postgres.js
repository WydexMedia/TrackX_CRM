/*
  MongoDB to PostgreSQL Migration Script
  Migrates all MongoDB collections to PostgreSQL tables
  
  Usage:
    node scripts/migrate-mongodb-to-postgres.js
  
  Required Environment Variables:
    - MONGODB_URI: MongoDB connection string
    - DATABASE_URL or PSQL or NEON_DATABASE_URL: PostgreSQL connection string
*/

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const { Pool } = require('pg');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const PG_URL = process.env.DATABASE_URL || process.env.PSQL || process.env.NEON_DATABASE_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in environment variables');
  process.exit(1);
}

if (!PG_URL) {
  console.error('❌ DATABASE_URL, PSQL, or NEON_DATABASE_URL is not set in environment variables');
  process.exit(1);
}

// Initialize connections
const mongoClient = new MongoClient(MONGODB_URI);

// Normalize and sanitize PostgreSQL URL (same logic as client.ts)
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

const url = normalizePostgresUrl(PG_URL);
const hostname = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

// SSL configuration - allow self-signed certs for remote connections
const pgPool = new Pool({
  connectionString: sanitizeUrl(url),
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_MAX_POOL_SIZE || 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5000),
});

// Helper function to get tenant ID from subdomain
async function getTenantIdFromSubdomain(subdomain, pgPool) {
  if (!subdomain) return null;
  
  try {
    const result = await pgPool.query(
      'SELECT id FROM tenants WHERE subdomain = $1',
      [subdomain]
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error(`Error fetching tenant ID for subdomain ${subdomain}:`, error.message);
    return null;
  }
}

// Create a map of subdomain -> tenant_id for performance
async function createTenantMap(pgPool) {
  const result = await pgPool.query('SELECT id, subdomain FROM tenants');
  const map = new Map();
  result.rows.forEach(row => {
    if (row.subdomain) {
      map.set(row.subdomain, row.id);
    }
  });
  return map;
}

// Migration functions
async function migrateUsers(mongoDb, pgPool, tenantMap) {
  console.log('\n📦 Migrating users collection...');
  
  const users = mongoDb.collection('users');
  const count = await users.countDocuments();
  console.log(`  Found ${count} users in MongoDB`);
  
  if (count === 0) {
    console.log('  ⏭️  No users to migrate');
    return { migrated: 0, skipped: 0, errors: 0 };
  }
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  const cursor = users.find({});
  
  for await (const mongoUser of cursor) {
    try {
      // Skip users without email (required field)
      if (!mongoUser.email || !mongoUser.email.trim()) {
        console.log(`  ⏭️  Skipping user without email (ID: ${mongoUser._id})`);
        skipped++;
        continue;
      }
      
      // Get tenant ID
      const tenantId = mongoUser.tenantSubdomain 
        ? (tenantMap.get(mongoUser.tenantSubdomain) || await getTenantIdFromSubdomain(mongoUser.tenantSubdomain, pgPool))
        : null;
      
      // Check if user already exists (by email)
      const existing = await pgPool.query(
        'SELECT id FROM users WHERE email = $1',
        [mongoUser.email]
      );
      
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }
      
      // Insert user
      const result = await pgPool.query(`
        INSERT INTO users (
          email, password, code, name, role, target, tenant_id,
          last_login, last_logout, last_token_revocation,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        mongoUser.email.trim(),
        mongoUser.password || '',
        mongoUser.code || null,
        mongoUser.name || null,
        mongoUser.role || 'sales',
        mongoUser.target || 0,
        tenantId,
        mongoUser.lastLogin ? new Date(mongoUser.lastLogin) : null,
        mongoUser.lastLogout ? new Date(mongoUser.lastLogout) : null,
        mongoUser.lastTokenRevocation ? new Date(mongoUser.lastTokenRevocation) : null,
        mongoUser.createdAt ? new Date(mongoUser.createdAt) : new Date(),
        mongoUser.updatedAt ? new Date(mongoUser.updatedAt) : new Date()
      ]);
      
      migrated++;
      if (migrated % 100 === 0) {
        console.log(`  ✓ Migrated ${migrated}/${count} users...`);
      }
    } catch (error) {
      console.error(`  ❌ Error migrating user ${mongoUser.email}:`, error.message);
      errors++;
    }
  }
  
  console.log(`  ✅ Users migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
  return { migrated, skipped, errors };
}

async function migrateSales(mongoDb, pgPool, tenantMap) {
  console.log('\n📦 Migrating sales collection...');
  
  const sales = mongoDb.collection('sales');
  const count = await sales.countDocuments();
  console.log(`  Found ${count} sales in MongoDB`);
  
  if (count === 0) {
    console.log('  ⏭️  No sales to migrate');
    return { migrated: 0, skipped: 0, errors: 0 };
  }
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  const cursor = sales.find({});
  
  for await (const mongoSale of cursor) {
    try {
      // Skip sales without customer phone (required field)
      if (!mongoSale.customerPhone || !mongoSale.customerPhone.trim()) {
        skipped++;
        continue;
      }
      
      // Get tenant ID
      const tenantId = mongoSale.tenantSubdomain 
        ? (tenantMap.get(mongoSale.tenantSubdomain) || await getTenantIdFromSubdomain(mongoSale.tenantSubdomain, pgPool))
        : null;
      
      // Parse amount - handle both number and string (decimal) formats
      let amount = 0;
      if (mongoSale.amount !== null && mongoSale.amount !== undefined) {
        if (typeof mongoSale.amount === 'string') {
          amount = Math.round(parseFloat(mongoSale.amount) * 100); // Convert to cents if decimal
        } else {
          amount = Math.round(Number(mongoSale.amount)); // Ensure integer
        }
      }
      
      // Insert sale
      const result = await pgPool.query(`
        INSERT INTO sales (
          customer_name, customer_phone, amount, course_name, course_id,
          new_admission, oga_name, lead_id, stage_notes, tenant_id,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        mongoSale.customerName || null,
        mongoSale.customerPhone.trim(),
        amount,
        mongoSale.courseName || null,
        mongoSale.courseId || null,
        mongoSale.newAdmission || 'Yes',
        mongoSale.ogaName || null,
        mongoSale.leadId || null,
        mongoSale.stageNotes || null,
        tenantId,
        mongoSale.createdAt ? new Date(mongoSale.createdAt) : new Date(),
        mongoSale.updatedAt ? new Date(mongoSale.updatedAt) : new Date()
      ]);
      
      migrated++;
      if (migrated % 100 === 0) {
        console.log(`  ✓ Migrated ${migrated}/${count} sales...`);
      }
    } catch (error) {
      console.error(`  ❌ Error migrating sale:`, error.message);
      errors++;
    }
  }
  
  console.log(`  ✅ Sales migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
  return { migrated, skipped, errors };
}

async function migrateTeamAssignments(mongoDb, pgPool, tenantMap, userCodeMap) {
  console.log('\n📦 Migrating teamAssignments collection...');
  
  const teamAssignments = mongoDb.collection('teamAssignments');
  const count = await teamAssignments.countDocuments();
  console.log(`  Found ${count} team assignments in MongoDB`);
  
  if (count === 0) {
    console.log('  ⏭️  No team assignments to migrate');
    return { migrated: 0, skipped: 0, errors: 0 };
  }
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  const cursor = teamAssignments.find({});
  
  for await (const mongoAssignment of cursor) {
    try {
      // Get tenant ID
      const tenantId = mongoAssignment.tenantSubdomain 
        ? (tenantMap.get(mongoAssignment.tenantSubdomain) || await getTenantIdFromSubdomain(mongoAssignment.tenantSubdomain, pgPool))
        : null;
      
      // Get user IDs from codes
      const salespersonId = userCodeMap.get(mongoAssignment.salespersonId) || null;
      const jlId = userCodeMap.get(mongoAssignment.jlId) || null;
      const assignedById = mongoAssignment.assignedBy ? (userCodeMap.get(mongoAssignment.assignedBy) || null) : null;
      
      if (!salespersonId || !jlId) {
        console.log(`  ⏭️  Skipping assignment: missing user IDs (salesperson: ${salespersonId}, jl: ${jlId})`);
        skipped++;
        continue;
      }
      
      // Insert team assignment
      await pgPool.query(`
        INSERT INTO team_assignments (
          salesperson_id, jl_id, status, assigned_by, assigned_at,
          deactivated_at, tenant_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        salespersonId,
        jlId,
        mongoAssignment.status || 'active',
        assignedById,
        mongoAssignment.assignedAt ? new Date(mongoAssignment.assignedAt) : new Date(),
        mongoAssignment.deactivatedAt ? new Date(mongoAssignment.deactivatedAt) : null,
        tenantId,
        mongoAssignment.createdAt ? new Date(mongoAssignment.createdAt) : new Date(),
        mongoAssignment.updatedAt ? new Date(mongoAssignment.updatedAt) : new Date()
      ]);
      
      migrated++;
      if (migrated % 50 === 0) {
        console.log(`  ✓ Migrated ${migrated}/${count} team assignments...`);
      }
    } catch (error) {
      console.error(`  ❌ Error migrating team assignment:`, error.message);
      errors++;
    }
  }
  
  console.log(`  ✅ Team assignments migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
  return { migrated, skipped, errors };
}

async function migrateDailyReports(mongoDb, pgPool, tenantMap) {
  console.log('\n📦 Migrating daily_reports collection...');
  
  const dailyReports = mongoDb.collection('daily_reports');
  const count = await dailyReports.countDocuments();
  console.log(`  Found ${count} daily reports in MongoDB`);
  
  if (count === 0) {
    console.log('  ⏭️  No daily reports to migrate');
    return { migrated: 0, skipped: 0, errors: 0 };
  }
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  const cursor = dailyReports.find({});
  
  for await (const mongoReport of cursor) {
    try {
      // Get tenant ID
      const tenantId = mongoReport.tenantSubdomain 
        ? (tenantMap.get(mongoReport.tenantSubdomain) || await getTenantIdFromSubdomain(mongoReport.tenantSubdomain, pgPool))
        : null;
      
      // Parse date
      const reportDate = mongoReport.date ? new Date(mongoReport.date) : new Date();
      
      // Check if report already exists
      const existing = await pgPool.query(
        'SELECT id FROM daily_reports WHERE tenant_id = $1 AND date = $2',
        [tenantId, reportDate]
      );
      
      let reportId;
      if (existing.rows.length > 0) {
        reportId = existing.rows[0].id;
        skipped++;
      } else {
        // Insert daily report
        const result = await pgPool.query(`
          INSERT INTO daily_reports (date, tenant_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [
          reportDate,
          tenantId,
          mongoReport.createdAt ? new Date(mongoReport.createdAt) : new Date(),
          mongoReport.updatedAt ? new Date(mongoReport.updatedAt) : new Date()
        ]);
        reportId = result.rows[0].id;
      }
      
      // Migrate salespersons array to daily_report_entries
      if (mongoReport.salespersons && Array.isArray(mongoReport.salespersons)) {
        for (const sp of mongoReport.salespersons) {
          try {
            await pgPool.query(`
              INSERT INTO daily_report_entries (
                report_id, salesperson_name, prospects, collection, sales, tenant_id, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT DO NOTHING
            `, [
              reportId,
              sp.name || null,
              sp.prospects || 0,
              sp.collection || null,
              sp.sales || null,
              tenantId,
              new Date()
            ]);
          } catch (entryError) {
            console.error(`  ⚠️  Error migrating daily report entry:`, entryError.message);
          }
        }
      }
      
      migrated++;
      if (migrated % 50 === 0) {
        console.log(`  ✓ Migrated ${migrated}/${count} daily reports...`);
      }
    } catch (error) {
      console.error(`  ❌ Error migrating daily report:`, error.message);
      errors++;
    }
  }
  
  console.log(`  ✅ Daily reports migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
  return { migrated, skipped, errors };
}

async function migrateJwtBlacklist(mongoDb, pgPool) {
  console.log('\n📦 Migrating jwt_blacklist collection...');
  
  const jwtBlacklist = mongoDb.collection('jwt_blacklist');
  const count = await jwtBlacklist.countDocuments();
  console.log(`  Found ${count} blacklisted tokens in MongoDB`);
  
  if (count === 0) {
    console.log('  ⏭️  No blacklisted tokens to migrate');
    return { migrated: 0, skipped: 0, errors: 0 };
  }
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  const cursor = jwtBlacklist.find({});
  
  for await (const mongoToken of cursor) {
    try {
      // Insert blacklisted token
      await pgPool.query(`
        INSERT INTO jwt_blacklist (token, user_id, revoked_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (token) DO NOTHING
      `, [
        mongoToken.token || null,
        mongoToken.userId ? String(mongoToken.userId) : null,
        mongoToken.revokedAt ? new Date(mongoToken.revokedAt) : new Date()
      ]);
      
      migrated++;
      if (migrated % 100 === 0) {
        console.log(`  ✓ Migrated ${migrated}/${count} blacklisted tokens...`);
      }
    } catch (error) {
      console.error(`  ❌ Error migrating blacklisted token:`, error.message);
      errors++;
    }
  }
  
  console.log(`  ✅ JWT blacklist migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
  return { migrated, skipped, errors };
}

// Create user code to ID map for team assignments
async function createUserCodeMap(pgPool) {
  const result = await pgPool.query('SELECT id, code FROM users WHERE code IS NOT NULL');
  const map = new Map();
  result.rows.forEach(row => {
    if (row.code) {
      map.set(row.code, row.id);
    }
  });
  return map;
}

// Main migration function
async function main() {
  console.log('🚀 Starting MongoDB to PostgreSQL Migration\n');
  console.log('=' .repeat(60));
  
  let mongoDb;
  
  try {
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoClient.connect();
    mongoDb = mongoClient.db();
    console.log('  ✅ Connected to MongoDB');
    
    // Test PostgreSQL connection
    console.log('\n📡 Testing PostgreSQL connection...');
    await pgPool.query('SELECT 1');
    console.log('  ✅ Connected to PostgreSQL');
    
    // Create tenant map
    console.log('\n🗺️  Creating tenant subdomain -> ID map...');
    const tenantMap = await createTenantMap(pgPool);
    console.log(`  ✅ Mapped ${tenantMap.size} tenants`);
    
    // Run migrations
    const results = {
      users: { migrated: 0, skipped: 0, errors: 0 },
      sales: { migrated: 0, skipped: 0, errors: 0 },
      teamAssignments: { migrated: 0, skipped: 0, errors: 0 },
      dailyReports: { migrated: 0, skipped: 0, errors: 0 },
      jwtBlacklist: { migrated: 0, skipped: 0, errors: 0 }
    };
    
    // Migrate users first (needed for team assignments)
    results.users = await migrateUsers(mongoDb, pgPool, tenantMap);
    
    // Create user code map after users are migrated
    const userCodeMap = await createUserCodeMap(pgPool);
    
    // Migrate other collections
    results.sales = await migrateSales(mongoDb, pgPool, tenantMap);
    results.teamAssignments = await migrateTeamAssignments(mongoDb, pgPool, tenantMap, userCodeMap);
    results.dailyReports = await migrateDailyReports(mongoDb, pgPool, tenantMap);
    results.jwtBlacklist = await migrateJwtBlacklist(mongoDb, pgPool);
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 MIGRATION SUMMARY\n');
    console.log('Collection         | Migrated | Skipped | Errors');
    console.log('-'.repeat(60));
    Object.entries(results).forEach(([collection, stats]) => {
      console.log(
        `${collection.padEnd(18)} | ${String(stats.migrated).padStart(8)} | ${String(stats.skipped).padStart(7)} | ${String(stats.errors).padStart(6)}`
      );
    });
    
    const totalMigrated = Object.values(results).reduce((sum, r) => sum + r.migrated, 0);
    const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);
    
    console.log('-'.repeat(60));
    console.log(
      `TOTAL               | ${String(totalMigrated).padStart(8)} | ${String(totalSkipped).padStart(7)} | ${String(totalErrors).padStart(6)}`
    );
    console.log('\n✅ Migration complete!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    // Close connections
    await mongoClient.close();
    await pgPool.end();
    console.log('🔌 Database connections closed');
  }
}

// Run migration
main().catch(console.error);

