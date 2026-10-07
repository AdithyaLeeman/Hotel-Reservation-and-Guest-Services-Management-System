/**
 * Run this script to generate a valid bcrypt hash for the admin account.
 * Usage: node scripts/gen-admin-hash.js
 *
 * Then paste the printed SQL into psql to update the admin password hash.
 */
const bcrypt = require('bcryptjs');

const PASSWORD = 'Admin@SkyNest2024!';
const USERNAME = 'admin@skynest.com';

bcrypt.hash(PASSWORD, 12).then((hash) => {
  console.log('\n✅ Hash generated successfully!\n');
  console.log('Run this SQL in psql:\n');
  console.log(`UPDATE user_account`);
  console.log(`SET password_hash = '${hash}'`);
  console.log(`WHERE username = '${USERNAME}';\n`);
  console.log('Then verify: SELECT length(password_hash) FROM user_account WHERE username = \'admin@skynest.com\';');
  console.log('Expected: 60\n');
});
