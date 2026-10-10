/**
 * Apply routines, views, triggers, and indexes to the existing database.
 * Run with: npm run db:routines
 *
 * Safe and idempotent: applies CREATE OR REPLACE routines, views, triggers,
 * and indexes without dropping the database or destroying data.
 */

import { Client } from 'pg';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

async function applySqlFile(client: Client, filePath: string): Promise<void> {
  const sql = await readFile(filePath, 'utf8');
  await client.query(sql);
}

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
    console.log(`[routines]   No files found in ${label} — skipping.`);
    return;
  }

  for (const name of entries) {
    process.stdout.write(`[routines]   ${label}/${name} ... `);
    await applySqlFile(client, join(dirPath, name));
    console.log('done');
  }
}

async function applyRoutines(): Promise<void> {
  const appUrl = process.env.DATABASE_URL;
  if (!appUrl) {
    console.error('[routines] DATABASE_URL not set in .env.local.');
    process.exit(1);
  }

  console.log('[routines] Connecting to database...');
  const appClient = new Client({ connectionString: appUrl });
  await appClient.connect();

  console.log('[routines] Applying stored functions & procedures...');
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

  for (const subdir of orderedRoutineSubdirs) {
    await applyDirectory(appClient, join(routinesDir, subdir), `routines/${subdir}`);
  }

  console.log('[routines] Applying views...');
  const orderedViews = [
    'vw_active_reservations.sql',
    'vw_audit_log.sql',
    'vw_invoice_totals.sql',
    'vw_guest_billing_summary.sql',
    'vw_monthly_revenue.sql',
    'vw_room_occupancy.sql',
    'vw_service_usage_breakdown.sql',
    'vw_top_services.sql',
  ];

  const viewsDir = join(PROJECT_ROOT, 'database', 'views');
  for (const name of orderedViews) {
    process.stdout.write(`[routines]   views/${name} ... `);
    await applySqlFile(appClient, join(viewsDir, name));
    console.log('done');
  }

  console.log('[routines] Applying triggers...');
  await applyDirectory(appClient, join(PROJECT_ROOT, 'database', 'triggers'), 'triggers');

  console.log('[routines] Applying indexes...');
  const indexesDir = join(PROJECT_ROOT, 'database', 'indexes');
  const orderedIndexes = ['idx_reservation_rooms_dates.sql'];
  for (const name of orderedIndexes) {
    process.stdout.write(`[routines]   indexes/${name} ... `);
    await applySqlFile(appClient, join(indexesDir, name));
    console.log('done');
  }

  await appClient.end();
  console.log('\n[routines] ✓ All routines, views, triggers, and indexes successfully applied!');
}

applyRoutines().catch((err) => {
  console.error('\n[routines] FAILED:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
