/**
 * One-shot script: re-apply sp_create_reservation to fix
 * "FOR UPDATE is not allowed with aggregate functions"
 *
 * Run: node scripts/apply-reservation-fix.js
 */
const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');

const connStr = process.env.DATABASE_URL || 'postgresql://postgres:pasindu2004@localhost:5432/hrgsms';

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'database', 'routines', 'reservations', 'sp_create_reservation.sql'),
    'utf8'
  );

  const client = new Client({ connectionString: connStr });
  await client.connect();
  console.log('Connected to:', connStr.replace(/:\/\/.*@/, '://***@'));

  try {
    await client.query(sql);
    console.log('✅  sp_create_reservation applied successfully.');
    console.log('    The "FOR UPDATE is not allowed with aggregate functions" bug is fixed.');
  } catch (err) {
    console.error('❌  Error applying procedure:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
