import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { pool } from './pool';

/**
 * Migration runner — applies all SQL files in manifest order.
 * Run with: npm run migrate
 *
 * Reads database/migrations/manifest.md to determine apply order.
 * Each migration file is executed as a single transaction.
 *
 * TODO (P01-M01-T01): Implement full migration runner with:
 * - Applied migration tracking table (schema_migrations)
 * - Idempotent apply (skip already-applied migrations)
 * - Manifest parsing to determine order
 */
async function runMigrations(): Promise<void> {
  console.log('[migrate] Starting migration runner...');

  // TODO: Parse manifest.md for ordered file list
  // TODO: Check schema_migrations table for already-applied migrations
  // TODO: Apply unapplied migrations in order
  // TODO: Record each successful migration in schema_migrations

  const migrationsDir = join(process.cwd(), 'database', 'migrations');
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    console.log(`[migrate] Applied: ${file}`);
  }

  console.log('[migrate] All migrations applied.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('[migrate] Failed:', err);
  process.exit(1);
});
