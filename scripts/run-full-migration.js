/*
  Complete MongoDB to PostgreSQL Migration Runner
  This script:
  1. Applies the SQL migration to create tables
  2. Migrates all data from MongoDB to PostgreSQL
  
  Usage:
    node scripts/run-full-migration.js
  
  Required Environment Variables:
    - MONGODB_URI: MongoDB connection string
    - DATABASE_URL or PSQL or NEON_DATABASE_URL: PostgreSQL connection string
*/

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PG_URL = process.env.DATABASE_URL || process.env.PSQL || process.env.NEON_DATABASE_URL;

if (!PG_URL) {
  console.error('❌ DATABASE_URL, PSQL, or NEON_DATABASE_URL is not set');
  process.exit(1);
}

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

async function applySqlMigration(sqlFile, pool) {
  console.log(`\n📄 Applying SQL migration: ${sqlFile}...`);
  
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  
  // Split SQL by semicolons but handle comments and multi-line statements
  const statements = sqlContent
    .replace(/--[^\r\n]*/g, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^\s*$/));
  
  let applied = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const statement of statements) {
    if (!statement) continue;
    
    try {
      await pool.query(statement + ';');
      applied++;
    } catch (error) {
      // Ignore "already exists" errors - these are OK
      if (error.message.includes('already exists') || 
          error.message.includes('duplicate') ||
          error.message.includes('relation') && error.message.includes('does not exist')) {
        skipped++;
      } else {
        console.error(`  ⚠️  Error: ${error.message.substring(0, 100)}`);
        errors++;
      }
    }
  }
  
  console.log(`  ✅ SQL migration applied: ${applied} statements, ${skipped} skipped, ${errors} errors`);
  
  if (errors > 0) {
    console.log('  ⚠️  Some errors occurred but migration continued');
  }
}

async function main() {
  console.log('🚀 Starting Complete MongoDB to PostgreSQL Migration\n');
  console.log('='.repeat(60));
  
  const url = normalizePostgresUrl(PG_URL);
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  
  const pool = new Pool({
    connectionString: sanitizeUrl(url),
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: Number(process.env.PG_MAX_POOL_SIZE || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5000),
  });
  
  try {
    // Test connection
    console.log('\n📡 Testing PostgreSQL connection...');
    await pool.query('SELECT 1');
    console.log('  ✅ Connected to PostgreSQL');
    
    // Step 1: Apply SQL migration
    const migrationFile = path.join(__dirname, '../drizzle/0008_migrate_mongodb_collections.sql');
    if (fs.existsSync(migrationFile)) {
      await applySqlMigration(migrationFile, pool);
    } else {
      console.log(`  ⚠️  Migration file not found: ${migrationFile}`);
      console.log('  Continuing with data migration anyway...');
    }
    
    // Step 2: Run data migration
    console.log('\n' + '='.repeat(60));
    console.log('\n📦 Starting data migration from MongoDB to PostgreSQL...\n');
    
    const dataMigrationScript = path.join(__dirname, 'migrate-mongodb-to-postgres.js');
    if (fs.existsSync(dataMigrationScript)) {
      console.log('Running data migration script...\n');
      execSync(`node "${dataMigrationScript}"`, { stdio: 'inherit', cwd: path.dirname(dataMigrationScript) });
    } else {
      console.error(`  ❌ Data migration script not found: ${dataMigrationScript}`);
      process.exit(1);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Complete migration finished successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);

