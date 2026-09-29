import mysql from 'mysql2/promise';

async function main() {
  const url = 'mysql://21BgP4L6KQ7yMqC.root:fl9qOdRUYhznaevP@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}';
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
