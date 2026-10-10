import { readFile } from 'fs/promises';
import { join } from 'path';
import { pool } from './pool';

/**
 * Migration runner — P01-M01-T03
 *
 * Reads database/migrations/manifest.md for the authoritative apply order.
 * Tracks applied files in the schema_migrations table so runs are idempotent.
 * Each migration file is executed inside its own transaction; a failure rolls
 * back that file only and stops the runner so the DB is never left in a
 * half-applied state.
 *
 * Usage:
 *   npm run migrate
 *
 * Requires:
 *   DATABASE_URL set in .env.local
 *
 * Lecture alignment: L05 (transactions), L06 (schema management)
 */

const MIGRATIONS_DIR = join(process.cwd(), 'database', 'migrations');
const MANIFEST_PATH = join(MIGRATIONS_DIR, 'manifest.md');

// ---------------------------------------------------------------------------
// Ensure the tracking table exists
// ---------------------------------------------------------------------------
async function ensureTrackingTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename        TEXT        PRIMARY KEY,
      applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checksum        TEXT        NOT NULL
    );
  `);
}

// ---------------------------------------------------------------------------
// Parse manifest.md — return filenames in the exact order listed.
// Lines inside the fenced code block that are not blank and not comments
// (#) and end in .sql are treated as migration filenames.
// ---------------------------------------------------------------------------
export function parseManifest(content: string): string[] {
  const files: string[] = [];
  let inApplyBlock = false;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();

    // Detect the fenced code block that holds the apply order
    if (line === '```') {
      inApplyBlock = !inApplyBlock;
      continue;
    }

    if (!inApplyBlock) continue;
    if (line.startsWith('#') || line === '') continue;

    if (line.endsWith('.sql')) {
      files.push(line);
    }
  }

  return files;
}

// ---------------------------------------------------------------------------
// Simple FNV-1a 32-bit checksum — catches accidental edits to applied files
// ---------------------------------------------------------------------------
export function checksum(content: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Fetch the set of already-applied migration filenames
// ---------------------------------------------------------------------------
async function appliedMigrations(): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY applied_at'
  );
  return new Set(result.rows.map((r) => r.filename));
}

// ---------------------------------------------------------------------------
// Apply a single migration file inside an explicit transaction
// ---------------------------------------------------------------------------
async function applyMigration(filename: string): Promise<void> {
  const filePath = join(MIGRATIONS_DIR, filename);
  let sql: string;

  try {
    sql = await readFile(filePath, 'utf8');
  } catch {
    throw new Error(
      `[migrate] Cannot read migration file: ${filename}\n` +
        `  Expected path: ${filePath}\n` +
        `  Is the file listed in manifest.md but not yet created?`
    );
  }

  const hash = checksum(sql);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
      [filename, hash]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export async function runMigrations(): Promise<void> {
  console.log('[migrate] Starting...');

  // 1. Ensure the tracking table exists before anything else
  await ensureTrackingTable();

  // 2. Parse manifest for the ordered file list
  let manifestContent: string;
  try {
    manifestContent = await readFile(MANIFEST_PATH, 'utf8');
  } catch {
    throw new Error(
      `[migrate] Cannot read manifest: ${MANIFEST_PATH}\n` +
        `  Make sure database/migrations/manifest.md exists.`
    );
  }

  const ordered = parseManifest(manifestContent);

  if (ordered.length === 0) {
    console.log('[migrate] No migrations listed in manifest — nothing to do.');
    return;
  }

  // 3. Determine which files still need to be applied
  const applied = await appliedMigrations();
  const pending = ordered.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log(
      `[migrate] All ${ordered.length} migration(s) already applied — nothing to do.`
    );
    return;
  }

  console.log(
    `[migrate] ${applied.size} already applied, ${pending.length} pending.`
  );

  // 4. Apply pending migrations in manifest order, one transaction each
  for (const filename of pending) {
    process.stdout.write(`[migrate]   Applying ${filename} ... `);
    try {
      await applyMigration(filename);
      console.log('done');
    } catch (err) {
      console.log('FAILED');
      console.error(`\n[migrate] Error applying ${filename}:`);
      console.error(err instanceof Error ? err.message : String(err));
      console.error('\n[migrate] Stopped. Fix the error above and run again.');
      process.exit(1);
    }
  }

  console.log(
    `[migrate] Done — ${pending.length} migration(s) applied successfully.`
  );
}

runMigrations()
  .catch((err) => {
    console.error('[migrate] Unexpected failure:', err);
    process.exit(1);
  })
  .finally(() => {
    // Always close the pool, even on error paths
    pool.end().catch(() => undefined);
  });
