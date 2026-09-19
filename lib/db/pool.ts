/**
 * Database Pool — singleton pg Pool for the entire application.
 *
 * P01-M01-T02: Implement real pg Pool
 *
 * Uses a single Pool instance per process (Next.js caches modules in dev
 * via the `global` trick below to survive hot-reloads without exhausting
 * connection limits).
 *
 * Environment variable required:
 *   DATABASE_URL=postgres://user:password@host:5432/dbname
 *
 * Optional overrides (all have sensible defaults):
 *   DB_POOL_MAX          max connections (default: 10)
 *   DB_POOL_IDLE_MS      idle timeout in ms (default: 30000)
 *   DB_POOL_CONNECT_MS   connection timeout in ms (default: 5000)
 *
 * See context/05-library-patterns.md for query and transaction patterns.
 */

import { Pool } from 'pg';
export type { PoolClient } from 'pg';

// ------------------------------------------------------------------
// Singleton guard — prevents multiple Pool instances during Next.js
// hot-reloads in development (each reload re-evaluates modules but
// the `global` object persists for the lifetime of the Node process).
// ------------------------------------------------------------------
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      '[pool.ts] DATABASE_URL is not set. ' +
      'Add it to your .env.local file:\n' +
      '  DATABASE_URL=postgres://user:password@localhost:5432/hrgsms'
    );
  }

  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS ?? 30_000),
    connectionTimeoutMillis: Number(process.env.DB_POOL_CONNECT_MS ?? 5_000),
    // Always use UTC so DATE / TIMESTAMPTZ values are unambiguous
    options: '-c timezone=UTC',
  });

  // Log unexpected pool errors instead of crashing the process
  p.on('error', (err) => {
    console.error('[pool] Unexpected idle client error:', err);
  });

  return p;
}

// In production, create once at module load.
// In development, reuse across hot-reloads via global.
export const pool: Pool =
  process.env.NODE_ENV === 'production'
    ? createPool()
    : (global.__pgPool ??= createPool());
