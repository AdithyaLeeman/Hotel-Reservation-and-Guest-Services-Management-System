/**
 * Database Pool — singleton pg Pool for the entire application.
 *
 * PHASE 1 NOTE: pg is installed in P01-M01-T01.
 * When pg is installed, replace this stub with:
 *
 *   import { Pool } from 'pg';
 *   export type { PoolClient } from 'pg';
 *   export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ... });
 *
 * Until then this file exports a typed stub that satisfies all imports.
 * See context/05-library-patterns.md for the full usage pattern.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Stub pool — replaced by real pg.Pool in P01-M01-T01
export const pool: {
  connect: () => Promise<any>;
  query: (sql: string, params?: any[]) => Promise<any>;
  on: (event: string, cb: (...args: any[]) => void) => void;
  end: () => Promise<void>;
} = {
  connect: () => { throw new Error('pg Pool not yet installed — run P01-M01-T01'); },
  query: () => { throw new Error('pg Pool not yet installed — run P01-M01-T01'); },
  on: () => { /* noop stub */ },
  end: () => { throw new Error('pg Pool not yet installed — run P01-M01-T01'); },
};

// PoolClient stub — replaced by real pg.PoolClient in P01-M01-T01
export type PoolClient = {
  query: (sql: string, params?: any[]) => Promise<any>;
  release: () => void;
};

/* eslint-enable @typescript-eslint/no-explicit-any */
