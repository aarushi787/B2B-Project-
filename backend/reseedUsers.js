import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function main() {
  const url = 'mysql://21BgP4L6KQ7yMqC.root:fl9qOdRUYhznaevP@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}';
  const conn = await mysql.createConnection(url);
  try {
    const password = await bcrypt.hash('password123', 10);
    
    // Create users
    await conn.query(
      `INSERT INTO users (id, email, password, phone, firstName, lastName, role) VALUES 
       ('admin-uuid', 'admin@example.com', ?, '+919800000001', 'System', 'Admin', 'admin'),
       ('buyer-uuid', 'rahul@example.com', ?, '+919800000003', 'Rahul', 'Buyer', 'buyer'),
       ('seller-uuid', 'maya@example.com', ?, '+919800000002', 'Maya', 'Sellers', 'seller')
       ON DUPLICATE KEY UPDATE password=VALUES(password)`,
      [password, password, password]
    );

    // Create companies
    await conn.query(
      `INSERT INTO companies (id, name, email, gst, phone, address, website, domain, industry, description, userId, verified) VALUES
       ('acme-corp-id', 'Acme Corp', 'hello@acmecorp.com', '27BBBBB2222B2Z2', '+919800001002', 'India', 'https://acme.com', 'acme.com', 'Logistics', 'Desc', 'buyer-uuid', 1)
       ON DUPLICATE KEY UPDATE name=VALUES(name)`
    );

    // Create company_members
    await conn.query(
      `INSERT INTO company_members (id, companyId, userId, role) VALUES
       ('member-1', 'acme-corp-id', 'buyer-uuid', 'OWNER')
       ON DUPLICATE KEY UPDATE role=VALUES(role)`
    );

    console.log('Successfully re-seeded minimal users.');
  } catch (err) {
    console.error('Error seeding:', err);
  } finally {
    await conn.end();
  }
}

main();
