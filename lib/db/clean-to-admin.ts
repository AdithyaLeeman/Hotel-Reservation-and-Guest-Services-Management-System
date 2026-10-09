/**
 * Clean database to Admin only - resets all guests, staff, bookings, and payments,
 * keeping only the administrator user account and reference master data intact.
 *
 * Run with: npm run db:clean-admin
 */
import { pool } from './pool';

async function cleanToAdmin(): Promise<void> {
  console.log('[cleanup] Starting database cleanup (keeping Admin only)...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Transactional reservation tables (FKs on reservation)
    console.log('[cleanup] Clearing reservation audit logs...');
    await client.query('DELETE FROM reservation_audit_log');

    console.log('[cleanup] Clearing payments...');
    await client.query('DELETE FROM payment');

    console.log('[cleanup] Clearing service usage records...');
    await client.query('DELETE FROM service_usage');

    console.log('[cleanup] Clearing billing summaries...');
    await client.query('DELETE FROM billing_summary');

    console.log('[cleanup] Clearing reservation rooms...');
    await client.query('DELETE FROM reservation_rooms');

    console.log('[cleanup] Clearing reservations...');
    await client.query('DELETE FROM reservation');

    // 2. Reset room occupancy status
    console.log('[cleanup] Resetting occupied rooms to Available...');
    await client.query("UPDATE room SET status = 'Available' WHERE status = 'Occupied'");

    // 3. Clear guests
    console.log('[cleanup] Clearing guest profiles...');
    await client.query('DELETE FROM guest');

    // 4. Clear non-admin employees
    console.log('[cleanup] Clearing non-admin employee profiles...');
    await client.query(`
      DELETE FROM employee
      WHERE user_id NOT IN (
        SELECT user_id FROM user_account WHERE role = 'Admin'
      )
    `);

    // 5. Clear non-admin user accounts
    console.log('[cleanup] Clearing non-admin user accounts...');
    await client.query("DELETE FROM user_account WHERE role <> 'Admin'");

    await client.query('COMMIT');
    console.log('[cleanup] ✓ Database cleanup completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[cleanup] ✗ Failed, rolled back transaction:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanToAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
