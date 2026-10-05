// Usage: npm run db:check  (from backend/). Tests the database login without starting the server and never prints secrets.
import pool from '../config/database.js';

async function main() {
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db, CURRENT_USER() AS who, VERSION() AS version');
    const r = (rows as any[])[0];
    const [users] = await pool.query('SELECT COUNT(*) AS n FROM users').catch(() => [[{ n: 'table missing - run npm run db:init' }]] as any);
    console.log(`OK: connected to "${r.db}" as ${r.who} (${r.version}). users: ${(users as any[])[0].n}`);
    process.exit(0);
  } catch (e: any) {
    console.error(`FAILED: ${e.code || ''} ${e.message}`);
    if (/Access denied/i.test(e.message)) console.error('The username or password in DATABASE_URL is wrong. Reset the password in the TiDB Cloud console (Connect), update backend/.env and run again.');
    process.exit(1);
  }
}

main();
