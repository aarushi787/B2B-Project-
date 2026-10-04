import 'dotenv/config';
import mysql from 'mysql2/promise';

// Credentials come from the environment (backend/.env), never from source code.
function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (see backend/.env)');
  return url;
}

async function main() {
  // Destructive (TRUNCATEs tables): require an explicit flag so it can never run by accident.
  if (!process.argv.includes('--confirm')) {
    console.error('Refusing to run: this deletes data. Re-run with --confirm against the database you intend.');
    process.exit(1);
  }
  const url = databaseUrl();
  const conn = await mysql.createConnection(url);
  try {
    // Disable foreign key checks temporarily
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Delete all products (services)
    await conn.query('TRUNCATE TABLE products');
    
    // Delete all users (accounts) and related data
    await conn.query('TRUNCATE TABLE users');
    await conn.query('TRUNCATE TABLE companies');
    await conn.query('TRUNCATE TABLE company_members');
    await conn.query('TRUNCATE TABLE deals');
    
    // Re-enable foreign key checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Successfully deleted all services and accounts.');
  } catch (err) {
    console.error('Error during deletion:', err);
  } finally {
    await conn.end();
  }
}

main();
