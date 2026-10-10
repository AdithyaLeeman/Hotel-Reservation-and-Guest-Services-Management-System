/**
 * DB reset script — P06-M01-T02
 *
 * Drops and recreates the database from empty, then runs migrations, applies
 * all routines/views/triggers/indexes in correct dependency order, and finally
 * seeds reference data.
 *
 * Run with: npm run db:reset
 *
 * Requires in .env.local:
 *   POSTGRES_ADMIN_URL — superuser connection string (NOT to hrgsms DB itself)
 *   DATABASE_URL       — application connection string (to hrgsms DB)
 *
 * WARNING: This destroys ALL data. Development use only.
 *
 * Lecture alignment: L05 (transactions, schema management), L06 (DDL lifecycle)
 */

import { Client } from 'pg';
import { execSync } from 'child_process';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Helper: run a SQL file against the application DB
// ---------------------------------------------------------------------------
async function applySqlFile(client: Client, filePath: string): Promise<void> {
  const sql = await readFile(filePath, 'utf8');
  await client.query(sql);
}

// ---------------------------------------------------------------------------
// Helper: apply all .sql files in a directory, sorted alphabetically
// ---------------------------------------------------------------------------
async function applyDirectory(
  client: Client,
  dirPath: string,
  label: string
): Promise<void> {
  let entries: string[];
  try {
    entries = (await readdir(dirPath, { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.endsWith('.sql') && e.name !== '.gitkeep')
      .map((e) => e.name)
      .sort();
  } catch {
    console.log(`[reset]   No files found in ${label} — skipping.`);
    return;
  }

  for (const name of entries) {
    process.stdout.write(`[reset]   ${label}/${name} ... `);
    await applySqlFile(client, join(dirPath, name));
    console.log('done');
  }
}

// ---------------------------------------------------------------------------
// Helper: apply all .sql files in a directory AND its subdirectories
// ---------------------------------------------------------------------------
async function applyDirectoryRecursive(
  client: Client,
  dirPath: string,
  label: string
): Promise<void> {
  let entries: import('fs').Dirent[];
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    console.log(`[reset]   No directory ${label} — skipping.`);
    return;
  }

  // Files at the top level first
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.sql') && e.name !== '.gitkeep')
    .map((e) => e.name)
    .sort();

  for (const name of files) {
    process.stdout.write(`[reset]   ${label}/${name} ... `);
    await applySqlFile(client, join(dirPath, name));
    console.log('done');
  }

  // Then subdirectories alphabetically
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();

  for (const dir of dirs) {
    await applyDirectoryRecursive(client, join(dirPath, dir), `${label}/${dir}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function resetDatabase(): Promise<void> {
  const adminUrl = process.env.POSTGRES_ADMIN_URL;
  const appUrl = process.env.DATABASE_URL;

  if (!adminUrl) {
    console.error(
      '[reset] POSTGRES_ADMIN_URL not set in .env.local.\n' +
        '  Add: POSTGRES_ADMIN_URL=postgresql://postgres@localhost:5432/postgres'
    );
    process.exit(1);
  }
  if (!appUrl) {
    console.error('[reset] DATABASE_URL not set in .env.local.');
    process.exit(1);
  }

  // Extract the target database name from the application URL
  const dbName = new URL(appUrl).pathname.slice(1);
  if (!dbName) {
    console.error(`[reset] Could not determine database name from DATABASE_URL: ${appUrl}`);
    process.exit(1);
  }

  console.log(`[reset] Target database: ${dbName}`);

  // -------------------------------------------------------------------------
  // Step 1: Drop and recreate the database via admin connection
  // -------------------------------------------------------------------------
  console.log('\n[reset] Step 1 — Drop and recreate database...');
  const adminClient = new Client({ connectionString: adminUrl });
  await adminClient.connect();

  // Terminate all existing connections to the target DB so DROP doesn't block
  await adminClient.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = $1 AND pid <> pg_backend_pid();
  `, [dbName]);

  await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}";`);
  console.log(`[reset]   Dropped database: ${dbName}`);

  await adminClient.query(`CREATE DATABASE "${dbName}";`);
  console.log(`[reset]   Created database: ${dbName}`);

  await adminClient.end();

  // -------------------------------------------------------------------------
  // Step 2: Run migrations (tables, enums, constraints, indexes in migrations/)
  // -------------------------------------------------------------------------
  console.log('\n[reset] Step 2 — Running migrations (npm run migrate)...');
  execSync('npm run migrate', { stdio: 'inherit', cwd: PROJECT_ROOT });

  // -------------------------------------------------------------------------
  // Step 3: Apply routines, views, triggers, and remaining indexes
  //         These are CREATE OR REPLACE objects applied after all tables exist.
  //
  //         Dependency order (must match FK and routine call graph):
  //           3a. billing-inputs (fn_calc_room_charges, fn_calc_service_charges,
  //               sp_log_service_usage) — no view deps
  //           3b. availability (fn_get_available_rooms) — depends on reservation_rooms
  //           3c. reservations (sp_create_reservation, fn_get_reservation_detail,
  //               sp_cancel_reservation) — depends on availability fn
  //           3d. checkin (sp_check_in) — depends on reservation tables
  //           3e. billing (sp_finalize_invoice) — depends on billing-inputs fns
  //           3f. payments (sp_post_payment) — depends on billing_summary
  //           3g. checkout (sp_checkout) — depends on payment + billing
  //           3h. views — depend on all tables + routines above
  //           3i. triggers — depend on tables + audit log
  //           3j. indexes — standalone, no deps beyond tables
  // -------------------------------------------------------------------------
  console.log('\n[reset] Step 3 — Applying routines, views, triggers, and indexes...');

  const appClient = new Client({ connectionString: appUrl });
  await appClient.connect();

  const routinesDir = join(PROJECT_ROOT, 'database', 'routines');
  const orderedRoutineSubdirs = [
    'billing-inputs',
    'availability',
    'reservations',
    'checkin',
    'billing',
    'payments',
    'checkout',
  ];

  console.log('[reset]   Routines:');
  for (const subdir of orderedRoutineSubdirs) {
    await applyDirectory(appClient, join(routinesDir, subdir), `routines/${subdir}`);
  }

  // Views must be applied in dependency order — vw_invoice_totals has no view
  // dependencies and must come before vw_guest_billing_summary and vw_monthly_revenue
  // which both SELECT from it.
  const orderedViews = [
    'vw_active_reservations.sql',
    'vw_audit_log.sql',
    'vw_invoice_totals.sql',           // no view deps — base view for billing
    'vw_guest_billing_summary.sql',    // depends on vw_invoice_totals
    'vw_monthly_revenue.sql',          // depends on vw_invoice_totals
    'vw_room_occupancy.sql',
    'vw_service_usage_breakdown.sql',
    'vw_top_services.sql',
  ];

  const viewsDir = join(PROJECT_ROOT, 'database', 'views');
  for (const name of orderedViews) {
    process.stdout.write(`[reset]   views/${name} ... `);
    await applySqlFile(appClient, join(viewsDir, name));
    console.log('done');
  }

  console.log('[reset]   Triggers:');
  await applyDirectory(appClient, join(PROJECT_ROOT, 'database', 'triggers'), 'triggers');

  // idx_reservation_rooms_room_dates.sql is a psql \ir redirect file — not valid SQL.
  // It simply re-includes idx_reservation_rooms_dates.sql which is already applied above.
  // We apply only real SQL index files here.
  const orderedIndexes = [
    'idx_reservation_rooms_dates.sql',
  ];

  const indexesDir = join(PROJECT_ROOT, 'database', 'indexes');
  for (const name of orderedIndexes) {
    process.stdout.write(`[reset]   indexes/${name} ... `);
    await applySqlFile(appClient, join(indexesDir, name));
    console.log('done');
  }

  await appClient.end();

  // -------------------------------------------------------------------------
  // Step 4: Run seeds
  // -------------------------------------------------------------------------
  console.log('\n[reset] Step 4 — Running seeds (npm run seed)...');
  execSync('npm run seed', { stdio: 'inherit', cwd: PROJECT_ROOT });

  console.log('\n[reset] ✓ Clean rebuild complete. Database is ready.');
}

resetDatabase().catch((err) => {
  console.error('\n[reset] FAILED:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
