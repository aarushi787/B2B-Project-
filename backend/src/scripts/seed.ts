// Purpose: This module (backend/src/scripts/seed.ts) is used to implement project functionality in a modular, maintainable way.
import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';

async function seed() {
  const connection = await pool.getConnection();
  try {
    logger.info('Starting DB seed...');

    // Users: Admins, Sellers, Buyers
    const users = [
      { email: 'admin@example.com', password: 'password123', phone: '+919800000001', firstName: 'System', lastName: 'Admin', role: 'admin' },
      { email: 'maya@example.com', password: 'password123', phone: '+919800000002', firstName: 'Maya', lastName: 'Sellers', role: 'seller' },
      { email: 'rahul@example.com', password: 'password123', phone: '+919800000003', firstName: 'Rahul', lastName: 'Buyer', role: 'buyer' },
      { email: 'priya@example.com', password: 'password123', phone: '+919800000004', firstName: 'Priya', lastName: 'Industrial', role: 'seller' },
      { email: 'amit@example.com', password: 'password123', phone: '+919800000005', firstName: 'Amit', lastName: 'Tech', role: 'buyer' },
      { email: 'sneha@example.com', password: 'password123', phone: '+919800000006', firstName: 'Sneha', lastName: 'Global', role: 'seller' },
      { email: 'vikram@example.com', password: 'password123', phone: '+919800000007', firstName: 'Vikram', lastName: 'Logistics', role: 'buyer' },
      { email: 'ananya@example.com', password: 'password123', phone: '+919800000008', firstName: 'Ananya', lastName: 'Support', role: 'admin' },
    ];

    for (const u of users) {
      const id = uuidv4();
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await connection.query(
        `INSERT INTO users (id, email, password, phone, firstName, lastName, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           password = VALUES(password),
           phone = VALUES(phone),
           firstName = VALUES(firstName),
           lastName = VALUES(lastName),
           role = VALUES(role)`,
        [id, u.email, hashedPassword, u.phone, u.firstName, u.lastName, u.role]
      );
    }

    // Companies
    const companies = [
      { name: 'TechVista Solutions', email: 'hello@techvista.com', gst: '27AAAAA1111A1Z1', phone: '+919800001001', industry: 'Technology', userEmail: 'maya@example.com', verified: true },
      { name: 'Acme Corp', email: 'hello@acmecorp.com', gst: '27BBBBB2222B2Z2', phone: '+919800001002', industry: 'Logistics', userEmail: 'rahul@example.com', verified: true },
      { name: 'Steel Fabrication Hub', email: 'info@steelfab.com', gst: '27CCCCC3333C3Z3', phone: '+919800001003', industry: 'Construction', userEmail: 'priya@example.com', verified: true },
      { name: 'Logic Flow Systems', email: 'support@logicflow.tech', gst: '27DDDDD4444D4Z4', phone: '+919800001004', industry: 'Technology', userEmail: 'amit@example.com', verified: true },
      { name: 'Green Earth Energy', email: 'clean@greenearth.org', gst: '27EEEEE5555E5Z5', phone: '+919800001005', industry: 'Energy', userEmail: 'sneha@example.com', verified: false },
    ];

    for (const c of companies) {
      const [userRows] = await connection.query('SELECT id FROM users WHERE email = ?', [c.userEmail]);
      const userId = (userRows as any[])[0]?.id || null;

      await connection.query(
        `INSERT INTO companies
         (id, name, email, gst, phone, address, website, domain, industry, description, userId, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           gst = VALUES(gst),
           userId = VALUES(userId),
           verified = VALUES(verified)`,
        [
          uuidv4(),
          c.name,
          c.email,
          c.gst,
          c.phone,
          'India',
          `https://${c.name.toLowerCase().replace(/ /g, '')}.com`,
          c.name.toLowerCase().replace(/ /g, '') + '.com',
          c.industry,
          `Premier provider in ${c.industry} sector.`,
          userId,
          c.verified,
        ]
      );
    }

    // Products
    const [compRows] = await connection.query('SELECT id, name FROM companies');
    const companyIds = compRows as any[];

    for (const comp of companyIds) {
      await connection.query(
        `INSERT IGNORE INTO products (id, name, description, price, category, inventory, merchantId)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), 
          `${comp.name} Pro Package`, 
          'Standard enterprise service offering for marketplace flows.', 
          Math.floor(Math.random() * 10000) + 1000, 
          'Services', 
          100, 
          comp.id
        ]
      );
    }

    // Additional Users: admin1, buyer1-5, seller1-5
    const additionalUsers = [
      { email: 'admin1@test.com', password: 'password123', phone: '+919800000009', firstName: 'Admin', lastName: 'One', role: 'admin' },
      { email: 'buyer1@test.com', password: 'password123', phone: '+919800000010', firstName: 'Buyer', lastName: 'One', role: 'buyer' },
      { email: 'buyer2@test.com', password: 'password123', phone: '+919800000011', firstName: 'Buyer', lastName: 'Two', role: 'buyer' },
      { email: 'buyer3@test.com', password: 'password123', phone: '+919800000012', firstName: 'Buyer', lastName: 'Three', role: 'buyer' },
      { email: 'buyer4@test.com', password: 'password123', phone: '+919800000013', firstName: 'Buyer', lastName: 'Four', role: 'buyer' },
      { email: 'buyer5@test.com', password: 'password123', phone: '+919800000014', firstName: 'Buyer', lastName: 'Five', role: 'buyer' },
      { email: 'seller1@test.com', password: 'password123', phone: '+919800000015', firstName: 'Seller', lastName: 'One', role: 'seller' },
      { email: 'seller2@test.com', password: 'password123', phone: '+919800000016', firstName: 'Seller', lastName: 'Two', role: 'seller' },
      { email: 'seller3@test.com', password: 'password123', phone: '+919800000017', firstName: 'Seller', lastName: 'Three', role: 'seller' },
      { email: 'seller4@test.com', password: 'password123', phone: '+919800000018', firstName: 'Seller', lastName: 'Four', role: 'seller' },
      { email: 'seller5@test.com', password: 'password123', phone: '+919800000019', firstName: 'Seller', lastName: 'Five', role: 'seller' },
    ];

    for (const u of additionalUsers) {
      const id = uuidv4();
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await connection.query(
        `INSERT IGNORE INTO users (id, email, password, phone, firstName, lastName, role)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, u.email, hashedPassword, u.phone, u.firstName, u.lastName, u.role]
      );
    }

    // Additional Companies with different verification and reputation levels
    const additionalCompanies = [
      { name: 'Tech Innovators Ltd', email: 'info@techinnovators.com', gst: '27FFFFF6666F6Z6', phone: '+919800001006', industry: 'Technology', userEmail: 'seller1@test.com', verified: true },
      { name: 'Logistics Pro', email: 'contact@logisticspro.in', gst: '27GGGGG7777G7Z7', phone: '+919800001007', industry: 'Logistics', userEmail: 'seller2@test.com', verified: false },
      { name: 'Manufacturing Hub', email: 'sales@manufacturinghub.com', gst: '27HHHHH8888H8Z8', phone: '+919800001008', industry: 'Manufacturing', userEmail: 'seller3@test.com', verified: true },
      { name: 'Energy Solutions Inc', email: 'support@energysolutions.org', gst: '27IIIII9999I9Z9', phone: '+919800001009', industry: 'Energy', userEmail: 'seller4@test.com', verified: false },
      { name: 'Construction Experts', email: 'hello@constructionexperts.com', gst: '27JJJJJ0000J0Z0', phone: '+919800001010', industry: 'Construction', userEmail: 'seller5@test.com', verified: true },
      { name: 'Retail Giants', email: 'info@retailgiants.in', gst: '27KKKKK1111K1Z1', phone: '+919800001011', industry: 'Retail', userEmail: 'buyer1@test.com', verified: true },
      { name: 'Healthcare Providers', email: 'contact@healthcareproviders.com', gst: '27LLLLL2222L2Z2', phone: '+919800001012', industry: 'Healthcare', userEmail: 'buyer2@test.com', verified: false },
    ];

    for (const c of additionalCompanies) {
      const [userRows] = await connection.query('SELECT id FROM users WHERE email = ?', [c.userEmail]);
      const userId = (userRows as any[])[0]?.id || null;

      await connection.query(
        `INSERT IGNORE INTO companies
         (id, name, email, gst, phone, address, website, domain, industry, description, userId, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          c.name,
          c.email,
          c.gst,
          c.phone,
          'India',
          `https://${c.name.toLowerCase().replace(/ /g, '')}.com`,
          c.name.toLowerCase().replace(/ /g, '') + '.com',
          c.industry,
          `Leading provider in ${c.industry} sector.`,
          userId,
          c.verified,
        ]
      );
    }

    // Deals
    const [allCompaniesRows] = await connection.query('SELECT id, name FROM companies');
    const allCompaniesList = allCompaniesRows as any[];

    // Golden Demo Story: Acme Corp (buyer) & TechVista Solutions (seller)
    const [acmeRows] = await connection.query('SELECT id FROM companies WHERE name = ?', ['Acme Corp']);
    const acmeId = (acmeRows as any[])[0]?.id;
    const [techVistaRows] = await connection.query('SELECT id FROM companies WHERE name = ?', ['TechVista Solutions']);
    const techVistaId = (techVistaRows as any[])[0]?.id;

    if (acmeId && techVistaId) {
      // Golden Path: Acme's Requirement
      const reqId1 = uuidv4();
      await connection.query(
        `INSERT IGNORE INTO deals (id, title, description, buyerId, sellerId, quantity, totalAmount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [reqId1, 'Cloud Migration AWS Infrastructure', 'Acme Corp requires a complete migration of on-premise servers to AWS.', acmeId, acmeId, 1, 50000, 'pending']
      );

      // TechVista's Proposal to Acme
      const propId1 = uuidv4();
      await connection.query(
        `INSERT IGNORE INTO deals (id, title, description, buyerId, sellerId, quantity, totalAmount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [propId1, 'Proposal: Cloud Migration AWS Infrastructure', 'TechVista Solutions bids for the AWS Migration. Includes DevOps pipeline.', acmeId, techVistaId, 1, 45000, 'pending']
      );

      // More Dummy Requirements from Acme
      await connection.query(
        `INSERT IGNORE INTO deals (id, title, description, buyerId, sellerId, quantity, totalAmount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), 'Enterprise CRM Integration', 'Looking for experts to integrate Salesforce with our internal ERP.', acmeId, acmeId, 1, 30000, 'pending']
      );
      
      // More Dummy Proposals received by Acme (from other companies)
      const [steelfabRows] = await connection.query('SELECT id FROM companies WHERE name = ?', ['Steel Fabrication Hub']);
      const steelId = (steelfabRows as any[])[0]?.id || techVistaId;
      await connection.query(
        `INSERT IGNORE INTO deals (id, title, description, buyerId, sellerId, quantity, totalAmount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), 'Proposal: Enterprise CRM Integration', 'We can do this in 4 weeks.', acmeId, steelId, 1, 28000, 'pending']
      );

      // More Proposals sent by TechVista to others
      const [logicRows] = await connection.query('SELECT id FROM companies WHERE name = ?', ['Logic Flow Systems']);
      const logicId = (logicRows as any[])[0]?.id || acmeId;
      await connection.query(
        `INSERT IGNORE INTO deals (id, title, description, buyerId, sellerId, quantity, totalAmount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), 'Proposal: Native iOS Healthcare App', 'TechVista offers full stack mobile development.', logicId, techVistaId, 1, 65000, 'shortlisted']
      );
      await connection.query(
        `INSERT IGNORE INTO deals (id, title, description, buyerId, sellerId, quantity, totalAmount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), 'Proposal: Blockchain Smart Contracts', 'TechVista bids for smart contract development.', logicId, techVistaId, 1, 22000, 'completed']
      );
    }

    // Escrows (all states)
    const [dealRows] = await connection.query('SELECT id, buyerId, sellerId, totalAmount FROM deals LIMIT 10');
    const deals = dealRows as any[];

    for (const deal of deals) {
      await connection.query(
        `INSERT IGNORE INTO escrows (id, dealId, payerCompanyId, payeeCompanyId, amount, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          deal.id,
          deal.buyerId,
          deal.sellerId,
          deal.totalAmount,
          ['CREATED', 'FUNDED', 'RELEASED', 'REFUNDED', 'FAILED'][Math.floor(Math.random() * 5)],
        ]
      );
    }

    // Payments (success + fail)
    const [escrowRows] = await connection.query('SELECT id, dealId, payerCompanyId, payeeCompanyId, amount FROM escrows');
    const escrows = escrowRows as any[];

    for (const escrow of escrows) {
      // Fund payment
      await connection.query(
        `INSERT IGNORE INTO payments (id, escrowId, dealId, companyId, amount, direction, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          escrow.id,
          escrow.dealId,
          escrow.payerCompanyId,
          escrow.amount,
          'OUT',
          ['PENDING', 'SUCCEEDED', 'FAILED'][Math.floor(Math.random() * 3)],
        ]
      );

      // Release payment
      await connection.query(
        `INSERT IGNORE INTO payments (id, escrowId, dealId, companyId, amount, direction, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          escrow.id,
          escrow.dealId,
          escrow.payeeCompanyId,
          escrow.amount,
          'IN',
          ['PENDING', 'SUCCEEDED', 'FAILED'][Math.floor(Math.random() * 3)],
        ]
      );
    }

    // AML Checks (approved + blocked)
    for (const escrow of escrows) {
      await connection.query(
        `INSERT IGNORE INTO aml_checks (id, dealId, escrowId, companyId, amount, riskScore, riskLevel, decision, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          escrow.dealId,
          escrow.id,
          escrow.payerCompanyId,
          escrow.amount,
          Math.floor(Math.random() * 100),
          ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
          ['PASS', 'REVIEW', 'BLOCK'][Math.floor(Math.random() * 3)],
          'Automated AML check result.',
        ]
      );
    }

    // KYC Documents
    const [companyRows] = await connection.query('SELECT id FROM companies');
    const companiesForKyc = companyRows as any[];

    for (const comp of companiesForKyc.slice(0, 5)) {
      await connection.query(
        `INSERT IGNORE INTO kyc_documents (id, companyId, documentType, status)
         VALUES (?, ?, ?, ?)`,
        [
          uuidv4(),
          comp.id,
          'GST Certificate',
          ['PENDING', 'VERIFIED', 'REJECTED'][Math.floor(Math.random() * 3)],
        ]
      );
    }

    // Audit Logs
    const [userRows] = await connection.query('SELECT id FROM users');
    const usersForAudit = userRows as any[];

    // Add specific audit logs for admin user
    const [adminUser] = await connection.query('SELECT id FROM users WHERE email = ?', ['admin@example.com']);
    const adminId = (adminUser as any[])[0]?.id;

    if (adminId) {
      await connection.query(
        `INSERT IGNORE INTO audit_logs (id, userId, action, resourceType, resourceId, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          adminId,
          'LOGIN',
          'user',
          adminId,
          JSON.stringify({ ip: '127.0.0.1', userAgent: 'Test Script' }),
        ]
      );

      await connection.query(
        `INSERT IGNORE INTO audit_logs (id, userId, action, resourceType, resourceId, metadata)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          adminId,
          'CREATE',
          'company',
          uuidv4(),
          JSON.stringify({ action: 'verified company', companyName: 'Test Company' }),
        ]
      );
    }

    for (let i = 0; i < 20; i++) {
      const userId = usersForAudit[Math.floor(Math.random() * usersForAudit.length)].id;
      await connection.query(
        `INSERT IGNORE INTO audit_logs (id, userId, action, resourceType, resourceId)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          userId,
          ['CREATE', 'UPDATE', 'DELETE'][Math.floor(Math.random() * 3)],
          ['company', 'deal', 'product'][Math.floor(Math.random() * 3)],
          uuidv4(),
        ]
      );
    }

    // User Consents
    for (const user of usersForAudit) {
      await connection.query(
        `INSERT IGNORE INTO user_consents (id, userId, purpose, granted)
         VALUES (?, ?, ?, ?)`,
        [
          uuidv4(),
          user.id,
          'marketing',
          Math.random() > 0.5,
        ]
      );
    }

    // Messages
    const [companyRowsForMsg] = await connection.query('SELECT id FROM companies');
    const companiesForMsg = companyRowsForMsg as any[];

    for (let i = 0; i < 15; i++) {
      const senderId = companiesForMsg[Math.floor(Math.random() * companiesForMsg.length)].id;
      const receiverId = companiesForMsg[Math.floor(Math.random() * companiesForMsg.length)].id;
      if (senderId !== receiverId) {
        await connection.query(
          `INSERT IGNORE INTO messages (id, senderId, receiverId, content, isRead)
           VALUES (?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            senderId,
            receiverId,
            `Message ${i + 1}: Business inquiry or update.`,
            Math.random() > 0.5,
          ]
        );
      }
    }

    // Notifications (read + unread)
    for (const user of usersForAudit.slice(0, 10)) {
      await connection.query(
        `INSERT IGNORE INTO notifications (id, userId, type, title, message, isRead)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          user.id,
          'deal_update',
          'Deal Status Update',
          'Your deal status has been updated.',
          Math.random() > 0.5,
        ]
      );
    }

    logger.info('Seed completed');
  } catch (err) {
    logger.error('Seed error:', err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seed();
