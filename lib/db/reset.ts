/**
 * DB reset script — drops and recreates the database, then runs migrations + seeds.
 * Run with: npm run db:reset
 *
 * WARNING: This destroys all data. Development use only.
 * Requires POSTGRES_ADMIN_URL in .env.local (superuser connection, not to hrgsms DB).
 *
 * PHASE 1 NOTE: pg is installed in P01-M01-T01.
 * When pg is installed, replace the stub below with: import { Client } from 'pg';
 */

import { execSync } from 'child_process';

async function resetDatabase(): Promise<void> {
  const adminUrl = process.env.POSTGRES_ADMIN_URL;
  if (!adminUrl) {
    console.error('[reset] POSTGRES_ADMIN_URL not set in .env.local');
    process.exit(1);
  }

  // TODO (P01-M01-T01): Replace this block with real pg.Client usage once pg is installed.
  throw new Error(
    '[reset] pg not yet installed. Run P01-M01-T01 first, then replace this stub with: ' +
    "import { Client } from 'pg'; const client = new Client({ connectionString: adminUrl });"
  );

  // Full implementation (uncomment after pg install):
  // const dbName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
  // const client = new Client({ connectionString: adminUrl });
  // await client.connect();
  // await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  // await client.query(`CREATE DATABASE "${dbName}"`);
  // await client.end();
  // execSync('npm run migrate', { stdio: 'inherit' });
  // execSync('npm run seed', { stdio: 'inherit' });
}

resetDatabase().catch((err) => {
  console.error('[reset] Failed:', err);
  process.exit(1);
});
