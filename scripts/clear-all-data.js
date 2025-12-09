/* eslint-disable */
require('dotenv').config();
const { Pool } = require('pg');

/**
 * WARNING: This script will DELETE ALL DATA from the PostgreSQL database!
 * 
 * It truncates all tables in the correct order to respect foreign key constraints.
 * Table structures (schema) will remain, but all data will be removed.
 */

async function clearAllData() {
  const url = process.env.DATABASE_URL || process.env.PSQL || process.env.NEON_DATABASE_URL;
  
  if (!url) {
    console.error('❌ No DATABASE_URL found in environment');
    process.exit(1);
  }

  // Normalize and sanitize URL (similar to client.ts)
  function normalizePostgresUrl(input) {
    if (!input) return "";
    let s = input.trim();
    const match = s.match(/(postgres(?:ql)?:\/\/[\w\-:@.%\/? ,=&+#]+)"?'?/i);
    if (s.startsWith("psql ") || match) {
      if (match && match[1]) return match[1];
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

  const normalizedUrl = normalizePostgresUrl(url);
  const sanitizedUrl = sanitizeUrl(normalizedUrl);
  
  const hostname = new URL(sanitizedUrl).hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  
  const pool = new Pool({ 
    connectionString: sanitizedUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('⚠️  WARNING: This will delete ALL data from the database!');
    console.log('Database:', new URL(sanitizedUrl).pathname.substring(1));
    console.log('Host:', hostname);
    console.log('');
    
    // List of tables in dependency order (tables with foreign keys last)
    // Order matters to avoid foreign key constraint violations
    const tables = [
      // Tables without foreign keys or with fewer dependencies first
      'daily_report_entries',
      'daily_reports',
      'jwt_blacklist',
      'lead_list_items',
      'lead_lists',
      'lead_stages',
      'call_logs',
      'lead_events',
      'tasks',
      'team_assignments',
      'sales',
      'leads',
      'courses',
      'users',
      'settings',
      'integrations',
      'tenants',
    ];

    console.log('🗑️  Starting data deletion...\n');

    // Disable foreign key checks temporarily (PostgreSQL doesn't support this directly,
    // so we'll truncate in the correct order and use CASCADE)
    await pool.query('SET session_replication_role = replica;');

    // Delete data from each table
    for (const table of tables) {
      try {
        // Check if table exists
        const tableExists = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );

        if (!tableExists.rows[0].exists) {
          console.log(`⏭️  Skipping ${table} (table doesn't exist)`);
          continue;
        }

        // Get row count before deletion
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count, 10);

        if (count === 0) {
          console.log(`✓ ${table}: already empty`);
          continue;
        }

        // Delete all rows (using DELETE instead of TRUNCATE to avoid permission issues)
        await pool.query(`DELETE FROM ${table}`);
        console.log(`✓ ${table}: deleted ${count} row(s)`);
      } catch (error) {
        console.error(`❌ Error deleting from ${table}:`, error.message);
        // Continue with other tables
      }
    }

    // Re-enable foreign key checks
    await pool.query('SET session_replication_role = DEFAULT;');

    // Reset sequences (auto-increment counters)
    console.log('\n🔄 Resetting auto-increment sequences...');
    const sequences = [
      'leads_id_seq',
      'tasks_id_seq',
      'integrations_id_seq',
      'settings_id_seq',
      'lead_events_id_seq',
      'call_logs_id_seq',
      'tenants_id_seq',
      'lead_lists_id_seq',
      'lead_list_items_id_seq',
      'lead_stages_id_seq',
      'courses_id_seq',
      'users_id_seq',
      'sales_id_seq',
      'team_assignments_id_seq',
      'daily_reports_id_seq',
      'daily_report_entries_id_seq',
      'jwt_blacklist_id_seq',
    ];

    for (const seq of sequences) {
      try {
        const seqExists = await pool.query(
          `SELECT EXISTS (
            SELECT FROM pg_class 
            WHERE relname = $1
          )`,
          [seq]
        );

        if (seqExists.rows[0].exists) {
          await pool.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
          console.log(`✓ Reset ${seq}`);
        }
      } catch (error) {
        // Sequence might not exist, continue
      }
    }

    console.log('\n✅ All data deleted successfully!');
    console.log('📊 Database tables are now empty but schema remains intact.');
    
  } catch (error) {
    console.error('\n❌ Error clearing data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
clearAllData().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

