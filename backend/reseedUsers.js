import 'dotenv/config';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// Credentials come from the environment (backend/.env), never from source code.
function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (see backend/.env)');
  return url;
}

const DEMO_EMAILS = ['admin@example.com', 'rahul@example.com', 'maya@example.com'];

async function main() {
  // Destructive (deletes these demo users and their companies): require an explicit flag.
  if (!process.argv.includes('--confirm')) {
    console.error(`Refusing to run: this deletes ${DEMO_EMAILS.join(', ')} and their companies. Re-run with --confirm against the database you intend.`);
    process.exit(1);
  }

  const conn = await mysql.createConnection(databaseUrl());
  try {
    const plain = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url');
    const password = await bcrypt.hash(plain, 10);

    // Remove previous copies of the demo users (members -> companies -> users, to satisfy foreign keys).
    const [old] = await conn.query('SELECT id FROM users WHERE email IN (?)', [DEMO_EMAILS]);
    const oldIds = old.map(u => u.id);
    if (oldIds.length) {
      await conn.query('DELETE FROM company_members WHERE userId IN (?)', [oldIds]);
      await conn.query('DELETE FROM companies WHERE userId IN (?)', [oldIds]);
      await conn.query('DELETE FROM users WHERE id IN (?)', [oldIds]);
    }

    // Real UUIDs: the API validates ids as UUIDs. Non-admin accounts use the neutral legacy role 'buyer'
    // (a company is a buyer/seller per deal, not per account).
    const ids = { admin: crypto.randomUUID(), rahul: crypto.randomUUID(), maya: crypto.randomUUID(), acme: crypto.randomUUID(), techvista: crypto.randomUUID() };

    await conn.query(
      'INSERT INTO users (id, email, password, phone, firstName, lastName, role) VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)',
      [
        ids.admin, 'admin@example.com', password, '+919800000001', 'System', 'Admin', 'admin',
        ids.rahul, 'rahul@example.com', password, '+919800000003', 'Rahul', 'Kumar', 'buyer',
        ids.maya, 'maya@example.com', password, '+919800000002', 'Maya', 'Sharma', 'buyer',
      ]
    );

    await conn.query(
      'INSERT INTO companies (id, name, email, gst, phone, address, website, domain, industry, description, userId, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        ids.acme, 'Acme Corp', 'hello@acmecorp.com', '27BBBBB2222B2Z2', '+919800001002', 'India', 'https://acme.com', 'acme.com', 'Logistics', 'Logistics and supply chain', ids.rahul, true,
        ids.techvista, 'TechVista Solutions', 'hello@techvista.com', '29AAAAA1111A1Z1', '+919800001001', 'India', 'https://techvista.com', 'techvista.com', 'Software', 'Software development and cloud services', ids.maya, true,
      ]
    );

    await conn.query(
      'INSERT INTO company_members (id, companyId, userId, role) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
      [crypto.randomUUID(), ids.acme, ids.rahul, 'OWNER', crypto.randomUUID(), ids.techvista, ids.maya, 'OWNER']
    );

    console.log('Re-seeded demo users:', DEMO_EMAILS.join(', '));
    if (!process.env.SEED_PASSWORD) console.log('Password (set SEED_PASSWORD to choose your own):', plain);
  } catch (err) {
    console.error('Error seeding:', err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
