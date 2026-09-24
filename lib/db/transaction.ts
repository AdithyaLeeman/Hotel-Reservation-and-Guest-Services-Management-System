import { pool, PoolClient } from './pool';

/**
 * Execute a function inside a PostgreSQL transaction.
 *
 * Wraps a pg PoolClient with BEGIN / COMMIT / ROLLBACK.
 * Any thrown error causes ROLLBACK and re-throws.
 *
 * Usage:
 *   const result = await withTransaction(async (client) => {
 *     await client.query('INSERT INTO ...', [params]);
 *     return await client.query('SELECT ...', [params]);
 *   });
 *
 * See context/05-library-patterns.md for the full pattern.
 * Lecture alignment: L05 (transactions, ACID), L08 (stored procedures may also own transactions)
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
