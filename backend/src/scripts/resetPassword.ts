// Dev helper: set a known password for existing accounts.
//
//   NEW_PASSWORD='YourPassw0rd!' npm run db:reset-password -- admin@example.com test.buyer@example.com
//
// PowerShell:  $env:NEW_PASSWORD='YourPassw0rd!'; npm run db:reset-password -- admin@example.com
//
// It only updates users that already exist, prints which ones changed, and never prints the password.
// It also revokes their refresh tokens so old sessions stop working. Refuses to run with NODE_ENV=production.
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run with NODE_ENV=production.');
    process.exit(1);
  }
  const password = process.env.NEW_PASSWORD;
  const emails = process.argv.slice(2).map((e) => e.toLowerCase().trim()).filter(Boolean);
  if (!password || password.length < 8 || emails.length === 0) {
    console.error('Set NEW_PASSWORD (8+ characters) and pass one or more emails.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  for (const email of emails) {
    const [result] = await pool.query('UPDATE users SET password = ? WHERE email = ?', [hash, email]);
    const changed = (result as { affectedRows: number }).affectedRows > 0;
    if (changed) {
      await pool.query(
        'UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE revokedAt IS NULL AND userId = (SELECT id FROM users WHERE email = ?)',
        [email]
      );
    }
    console.log(`${changed ? 'updated  ' : 'not found'} ${email}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
