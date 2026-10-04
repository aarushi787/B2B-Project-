import 'dotenv/config';
import mysql from 'mysql2/promise';

// Credentials come from the environment (backend/.env), never from source code.
function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (see backend/.env)');
  return url;
}
async function main() {
  const url = databaseUrl();
  const conn = await mysql.createConnection(url);
  const [rows] = await conn.query('SHOW TABLES');
  console.log(rows);
  await conn.end();
}
main();
