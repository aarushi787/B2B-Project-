// Purpose: This module (backend/src/config/init.ts) is used to implement project functionality in a modular, maintainable way.
import { pathToFileURL } from 'url';
import pool from './database.js';
import { logger } from '../utils/logger.js';

const hasColumn = async (connection: any, table: string, column: string): Promise<boolean> => {
  const [rows] = await connection.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return (rows as any[]).length > 0;
};

const addColumnIfMissing = async (connection: any, table: string, column: string, definition: string) => {
  if (!(await hasColumn(connection, table, column))) {
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const hasIndex = async (connection: any, table: string, indexName: string): Promise<boolean> => {
  const [rows] = await connection.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [table, indexName]
  );
  return (rows as any[]).length > 0;
};

const createIndexIfMissing = async (connection: any, table: string, indexName: string, columns: string) => {
  if (!(await hasIndex(connection, table, indexName))) {
    await connection.query(`CREATE INDEX ${indexName} ON ${table}(${columns})`);
  }
};

export async function initializeDatabase(options: { standalone?: boolean } = {}) {
  try {
    const connection = await pool.getConnection();
    
    logger.info('Creating tables...');

    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(30),
        firstName VARCHAR(100),
        lastName VARCHAR(100),
        role ENUM('buyer', 'seller', 'admin') DEFAULT 'buyer',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Companies table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        gst VARCHAR(50),
        pan VARCHAR(20),
        phone VARCHAR(30),
        address TEXT,
        website VARCHAR(255),
        domain VARCHAR(255),
        industry VARCHAR(100),
        description TEXT,
        verified BOOLEAN DEFAULT FALSE,
        userId VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Backward-compatible migrations for existing DBs and older MySQL versions
    await addColumnIfMissing(connection, 'users', 'phone', 'VARCHAR(30)');
    await addColumnIfMissing(connection, 'users', 'emailVerified', 'BOOLEAN DEFAULT FALSE');
    await addColumnIfMissing(connection, 'users', 'verifyToken', 'VARCHAR(255) NULL');
    await addColumnIfMissing(connection, 'users', 'verifyTokenExpiresAt', 'TIMESTAMP NULL');
    await addColumnIfMissing(connection, 'users', 'emailNotifications', 'BOOLEAN NOT NULL DEFAULT TRUE');
    // A suspended user cannot sign in or refresh a session. The row and all their records stay intact.
    await addColumnIfMissing(connection, 'users', 'phoneVerified', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await addColumnIfMissing(connection, 'users', 'suspendedAt', 'TIMESTAMP NULL');
    await addColumnIfMissing(connection, 'users', 'suspendedReason', 'VARCHAR(255) NULL');
    await addColumnIfMissing(connection, 'users', 'resetToken', 'VARCHAR(255) NULL');
    await addColumnIfMissing(connection, 'users', 'resetTokenExpiry', 'TIMESTAMP NULL');
    await addColumnIfMissing(connection, 'companies', 'gst', 'VARCHAR(50)');
    await addColumnIfMissing(connection, 'companies', 'pan', 'VARCHAR(20)');
    await addColumnIfMissing(connection, 'companies', 'phone', 'VARCHAR(30)');
    await addColumnIfMissing(connection, 'companies', 'address', 'TEXT');
    await addColumnIfMissing(connection, 'companies', 'website', 'VARCHAR(255)');
    await addColumnIfMissing(connection, 'companies', 'deletedAt', 'TIMESTAMP NULL');

    // Products table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(15, 2) NOT NULL,
        category VARCHAR(100),
        inventory INT DEFAULT 0,
        merchantId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt TIMESTAMP NULL,
        FOREIGN KEY (merchantId) REFERENCES companies(id) ON DELETE CASCADE
      )
    `);

    // Deals table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        buyerId VARCHAR(36) NOT NULL,
        sellerId VARCHAR(36) NOT NULL,
        productId VARCHAR(36),
        quantity INT,
        totalAmount DECIMAL(15, 2),
        status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt TIMESTAMP NULL,
        FOREIGN KEY (buyerId) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (sellerId) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (productId) REFERENCES products(id)
      )
    `);

    // Requirements (RFQs): a company asks for work. Replaces the old hack of storing them as deals.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS requirements (
        id VARCHAR(36) PRIMARY KEY,
        companyId VARCHAR(36) NOT NULL,
        createdBy VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        budgetMin DECIMAL(15, 2) NULL,
        budgetMax DECIMAL(15, 2) NULL,
        currency CHAR(3) NOT NULL DEFAULT 'INR',
        timeline VARCHAR(100),
        status ENUM('open', 'closed', 'awarded', 'cancelled') NOT NULL DEFAULT 'open',
        awardedProposalId VARCHAR(36) NULL,
        dealId VARCHAR(36) NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt TIMESTAMP NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Proposals: one per company per requirement. The row always holds the CURRENT terms; history is in proposal_revisions.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id VARCHAR(36) PRIMARY KEY,
        requirementId VARCHAR(36) NOT NULL,
        companyId VARCHAR(36) NOT NULL,
        createdBy VARCHAR(36) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        currency CHAR(3) NOT NULL DEFAULT 'INR',
        timeline VARCHAR(100),
        message TEXT,
        deliverables TEXT,
        status ENUM('submitted', 'shortlisted', 'rejected', 'accepted', 'withdrawn') NOT NULL DEFAULT 'submitted',
        lastOfferBy ENUM('proposer', 'requester') NOT NULL DEFAULT 'proposer',
        version INT NOT NULL DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_proposals_requirement_company (requirementId, companyId),
        FOREIGN KEY (requirementId) REFERENCES requirements(id) ON DELETE CASCADE,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Append-only negotiation history: the first proposal and every counter-offer.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS proposal_revisions (
        id VARCHAR(36) PRIMARY KEY,
        proposalId VARCHAR(36) NOT NULL,
        version INT NOT NULL,
        offeredBy ENUM('proposer', 'requester') NOT NULL,
        authorCompanyId VARCHAR(36) NOT NULL,
        authorUserId VARCHAR(36) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        timeline VARCHAR(100),
        message TEXT,
        deliverables TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_proposal_revisions_version (proposalId, version),
        FOREIGN KEY (proposalId) REFERENCES proposals(id) ON DELETE CASCADE
      )
    `);

    // Messages table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        senderId VARCHAR(36) NOT NULL,
        receiverId VARCHAR(36) NOT NULL,
        dealId VARCHAR(36),
        content TEXT NOT NULL,
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deletedAt TIMESTAMP NULL,
        FOREIGN KEY (senderId) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (receiverId) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE CASCADE
      )
    `);

    await addColumnIfMissing(connection, 'products', 'deletedAt', 'TIMESTAMP NULL');
    await addColumnIfMissing(connection, 'deals', 'deletedAt', 'TIMESTAMP NULL');
    await addColumnIfMissing(connection, 'messages', 'deletedAt', 'TIMESTAMP NULL');
    await createIndexIfMissing(connection, 'companies', 'idx_companies_deletedAt', 'deletedAt');
    await createIndexIfMissing(connection, 'products', 'idx_products_deletedAt', 'deletedAt');
    await createIndexIfMissing(connection, 'deals', 'idx_deals_deletedAt', 'deletedAt');
    await createIndexIfMissing(connection, 'requirements', 'idx_requirements_company', 'companyId');
    await createIndexIfMissing(connection, 'requirements', 'idx_requirements_status_category', 'status, category');
    await createIndexIfMissing(connection, 'proposals', 'idx_proposals_requirement', 'requirementId');
    await createIndexIfMissing(connection, 'proposals', 'idx_proposals_company', 'companyId');
    await createIndexIfMissing(connection, 'messages', 'idx_messages_deletedAt', 'deletedAt');
    // The inbox reads "everything sent to or by this company, newest first".
    await createIndexIfMissing(connection, 'messages', 'idx_messages_receiver_created', 'receiverId, createdAt');
    await createIndexIfMissing(connection, 'messages', 'idx_messages_sender_created', 'senderId, createdAt');
    await createIndexIfMissing(connection, 'messages', 'idx_messages_deal', 'dealId');
    await createIndexIfMissing(connection, 'products', 'idx_products_merchant', 'merchantId');
    await createIndexIfMissing(connection, 'requirements', 'idx_requirements_created', 'createdAt');

    // Ledger table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ledger (
        id VARCHAR(36) PRIMARY KEY,
        companyId VARCHAR(36) NOT NULL,
        dealId VARCHAR(36),
        type ENUM('debit', 'credit') NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (dealId) REFERENCES deals(id)
      )
    `);

    // Deal milestones: planned steps of the work. The provider marks one done, the client confirms it, and the
    // client's escrow payment for that step (if any) is released on confirmation.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id VARCHAR(36) PRIMARY KEY,
        dealId VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
        currency CHAR(3) NOT NULL DEFAULT 'INR',
        dueDate DATE NULL,
        position INT NOT NULL DEFAULT 0,
        status ENUM('PLANNED', 'SUBMITTED', 'APPROVED') NOT NULL DEFAULT 'PLANNED',
        submittedAt TIMESTAMP NULL,
        submittedBy VARCHAR(36),
        approvedAt TIMESTAMP NULL,
        approvedBy VARCHAR(36),
        changeNote VARCHAR(500) NULL,
        escrowStatus ENUM('NOT_FUNDED', 'FUNDED', 'RELEASED') NOT NULL DEFAULT 'NOT_FUNDED',
        paymentIntentId VARCHAR(255) NULL,
        createdBy VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt TIMESTAMP NULL,
        FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE CASCADE
      )
    `);
    await createIndexIfMissing(connection, 'milestones', 'idx_milestones_dealId', 'dealId');
    await createIndexIfMissing(connection, 'milestones', 'idx_milestones_status', 'status');

    // One-time codes for verifying a phone number. Only a keyed hash of the code is kept.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS phone_verifications (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        codeHash CHAR(64) NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        expiresAt TIMESTAMP NOT NULL,
        consumedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await createIndexIfMissing(connection, 'phone_verifications', 'idx_phone_verifications_user', 'userId, createdAt');

    // Company members (multi-user roles per company)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS company_members (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        companyId VARCHAR(36) NOT NULL,
        role ENUM('OWNER', 'ADMIN', 'FINANCE', 'LEGAL', 'OPS', 'VIEWER') DEFAULT 'VIEWER',
        status ENUM('INVITED', 'ACTIVE', 'DISABLED') DEFAULT 'INVITED',
        invitedBy VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_company (userId, companyId),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
      )
    `);

    // Escrow records
    await connection.query(`
      CREATE TABLE IF NOT EXISTS escrows (
        id VARCHAR(36) PRIMARY KEY,
        dealId VARCHAR(36) NOT NULL,
        payerCompanyId VARCHAR(36) NOT NULL,
        payeeCompanyId VARCHAR(36) NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        status ENUM('CREATED', 'FUNDED', 'RELEASED', 'REFUNDED', 'FAILED') DEFAULT 'CREATED',
        paymentProvider VARCHAR(100),
        providerReference VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE CASCADE,
        FOREIGN KEY (payerCompanyId) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (payeeCompanyId) REFERENCES companies(id) ON DELETE CASCADE
      )
    `);

    // Payment transactions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(36) PRIMARY KEY,
        escrowId VARCHAR(36),
        dealId VARCHAR(36),
        companyId VARCHAR(36),
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        direction ENUM('IN', 'OUT') NOT NULL,
        status ENUM('PENDING', 'SUCCEEDED', 'FAILED') DEFAULT 'PENDING',
        provider VARCHAR(100),
        providerReference VARCHAR(255),
        metadata JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (escrowId) REFERENCES escrows(id) ON DELETE SET NULL,
        FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL
      )
    `);

    await createIndexIfMissing(connection, 'payments', 'idx_payments_companyId', 'companyId');
    await createIndexIfMissing(connection, 'payments', 'idx_payments_dealId', 'dealId');
    await createIndexIfMissing(connection, 'payments', 'idx_payments_status', 'status');
    await createIndexIfMissing(connection, 'payments', 'idx_payments_createdAt', 'createdAt');

    // Gateway payment intents
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        id VARCHAR(36) PRIMARY KEY,
        escrowId VARCHAR(36),
        dealId VARCHAR(36),
        payerCompanyId VARCHAR(36),
        payeeCompanyId VARCHAR(36),
        amount DECIMAL(15, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        provider ENUM('RAZORPAY', 'STRIPE') NOT NULL,
        providerIntentId VARCHAR(255) NOT NULL UNIQUE,
        idempotencyKey VARCHAR(128) NOT NULL UNIQUE,
        status ENUM('CREATED', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'CANCELED') DEFAULT 'CREATED',
        metadata JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (escrowId) REFERENCES escrows(id) ON DELETE SET NULL,
        FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (payerCompanyId) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (payeeCompanyId) REFERENCES companies(id) ON DELETE SET NULL
      )
    `);

    await createIndexIfMissing(connection, 'payment_intents', 'idx_payment_intents_escrowId', 'escrowId');
    await createIndexIfMissing(connection, 'payment_intents', 'idx_payment_intents_dealId', 'dealId');
    await createIndexIfMissing(connection, 'payment_intents', 'idx_payment_intents_status', 'status');
    await createIndexIfMissing(connection, 'payment_intents', 'idx_payment_intents_createdAt', 'createdAt');

    // Webhook event idempotency + observability
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_webhook_events (
        id VARCHAR(36) PRIMARY KEY,
        provider ENUM('RAZORPAY', 'STRIPE') NOT NULL,
        eventId VARCHAR(255) NOT NULL UNIQUE,
        eventType VARCHAR(120) NOT NULL,
        signatureValid BOOLEAN DEFAULT FALSE,
        payload JSON,
        processedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await createIndexIfMissing(connection, 'payment_webhook_events', 'idx_payment_webhook_events_provider', 'provider');
    await createIndexIfMissing(connection, 'payment_webhook_events', 'idx_payment_webhook_events_createdAt', 'createdAt');

    // Prevent duplicate ledger sync for webhook retries
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_ledger_sync (
        paymentId VARCHAR(36) PRIMARY KEY,
        ledgerEntryId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paymentId) REFERENCES payments(id) ON DELETE CASCADE,
        FOREIGN KEY (ledgerEntryId) REFERENCES ledger(id) ON DELETE CASCADE
      )
    `);

    // Notifications (plus real-time stream support in route layer)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36),
        companyId VARCHAR(36),
        type VARCHAR(60) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        payload JSON,
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL
      )
    `);

    await createIndexIfMissing(connection, 'notifications', 'idx_notifications_userId', 'userId');
    await createIndexIfMissing(connection, 'notifications', 'idx_notifications_companyId', 'companyId');
    await createIndexIfMissing(connection, 'notifications', 'idx_notifications_createdAt', 'createdAt');

    // Documents + signatures (upload metadata + e-sign)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY,
        dealId VARCHAR(36),
        companyId VARCHAR(36),
        uploadedBy VARCHAR(36),
        fileName VARCHAR(255) NOT NULL,
        filePath TEXT,
        mimeType VARCHAR(120),
        sizeBytes BIGINT,
        docType VARCHAR(80),
        status ENUM('UPLOADED', 'SIGNED', 'REJECTED') DEFAULT 'UPLOADED',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt TIMESTAMP NULL,
        FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await addColumnIfMissing(connection, 'documents', 'deletedAt', 'TIMESTAMP NULL');
    // E-signed agreements: the generated text and its SHA-256 fingerprint.
    await addColumnIfMissing(connection, 'documents', 'content', 'LONGTEXT NULL');
    await addColumnIfMissing(connection, 'documents', 'contentHash', 'VARCHAR(64) NULL');
    await createIndexIfMissing(connection, 'documents', 'idx_documents_deletedAt', 'deletedAt');

    await createIndexIfMissing(connection, 'documents', 'idx_documents_companyId', 'companyId');
    await createIndexIfMissing(connection, 'documents', 'idx_documents_dealId', 'dealId');
    await createIndexIfMissing(connection, 'documents', 'idx_documents_status', 'status');
    await createIndexIfMissing(connection, 'documents', 'idx_documents_createdAt', 'createdAt');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS document_signatures (
        id VARCHAR(36) PRIMARY KEY,
        documentId VARCHAR(36) NOT NULL,
        userId VARCHAR(36),
        companyId VARCHAR(36),
        signatureType ENUM('CLICK', 'OTP', 'DIGITAL') DEFAULT 'CLICK',
        ipAddress VARCHAR(80),
        signedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL
      )
    `);

    await addColumnIfMissing(connection, 'document_signatures', 'signerName', 'VARCHAR(255) NULL');
    await addColumnIfMissing(connection, 'document_signatures', 'contentHash', 'VARCHAR(64) NULL');
    await createIndexIfMissing(connection, 'document_signatures', 'idx_document_signatures_documentId', 'documentId');
    await createIndexIfMissing(connection, 'document_signatures', 'idx_document_signatures_userId', 'userId');
    await createIndexIfMissing(connection, 'document_signatures', 'idx_document_signatures_companyId', 'companyId');
    await createIndexIfMissing(connection, 'document_signatures', 'idx_document_signatures_signedAt', 'signedAt');

    // KYC documents (sensitive metadata encrypted at app layer before storage)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS kyc_documents (
        id VARCHAR(36) PRIMARY KEY,
        companyId VARCHAR(36) NOT NULL,
        uploadedBy VARCHAR(36),
        documentType VARCHAR(80) NOT NULL,
        encryptedMeta LONGTEXT,
        status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
        verifierUserId VARCHAR(36),
        verifiedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (verifierUserId) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await createIndexIfMissing(connection, 'kyc_documents', 'idx_kyc_documents_companyId', 'companyId');
    await createIndexIfMissing(connection, 'kyc_documents', 'idx_kyc_documents_status', 'status');
    await createIndexIfMissing(connection, 'kyc_documents', 'idx_kyc_documents_createdAt', 'createdAt');

    // Reputation events
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reputation_events (
        id VARCHAR(36) PRIMARY KEY,
        companyId VARCHAR(36) NOT NULL,
        counterpartyCompanyId VARCHAR(36),
        dealId VARCHAR(36),
        score INT NOT NULL,
        comment TEXT,
        createdBy VARCHAR(36),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
        FOREIGN KEY (counterpartyCompanyId) REFERENCES companies(id) ON DELETE SET NULL,
        FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await createIndexIfMissing(connection, 'reputation_events', 'idx_reputation_events_companyId', 'companyId');
    await createIndexIfMissing(connection, 'reputation_events', 'idx_reputation_events_dealId', 'dealId');
    await createIndexIfMissing(connection, 'reputation_events', 'idx_reputation_events_createdAt', 'createdAt');

    // Audit logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36),
        companyId VARCHAR(36),
        action VARCHAR(120) NOT NULL,
        resourceType VARCHAR(120),
        resourceId VARCHAR(120),
        metadata JSON,
        ipAddress VARCHAR(80),
        userAgent VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL
      )
    `);

    await createIndexIfMissing(connection, 'audit_logs', 'idx_audit_logs_userId', 'userId');
    await createIndexIfMissing(connection, 'audit_logs', 'idx_audit_logs_companyId', 'companyId');
    await createIndexIfMissing(connection, 'audit_logs', 'idx_audit_logs_createdAt', 'createdAt');

    // AML checks for payment/escrow operations
    await connection.query(`
      CREATE TABLE IF NOT EXISTS aml_checks (
        id VARCHAR(36) PRIMARY KEY,
        dealId VARCHAR(36),
        escrowId VARCHAR(36),
        companyId VARCHAR(36),
        amount DECIMAL(15, 2),
        currency VARCHAR(10),
        riskScore INT NOT NULL,
        riskLevel ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
        decision ENUM('PASS', 'REVIEW', 'BLOCK') NOT NULL,
        reason TEXT,
        metadata JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dealId) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (escrowId) REFERENCES escrows(id) ON DELETE SET NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL
      )
    `);

    await createIndexIfMissing(connection, 'aml_checks', 'idx_aml_checks_companyId', 'companyId');
    await createIndexIfMissing(connection, 'aml_checks', 'idx_aml_checks_dealId', 'dealId');
    await createIndexIfMissing(connection, 'aml_checks', 'idx_aml_checks_createdAt', 'createdAt');

    // GDPR data rights and consent tracking
    await connection.query(`
      CREATE TABLE IF NOT EXISTS gdpr_requests (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        type ENUM('EXPORT', 'DELETE') NOT NULL,
        status ENUM('REQUESTED', 'PROCESSING', 'COMPLETED', 'REJECTED') DEFAULT 'REQUESTED',
        reason TEXT,
        completedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_consents (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        purpose VARCHAR(120) NOT NULL,
        granted BOOLEAN NOT NULL,
        source VARCHAR(120),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await createIndexIfMissing(connection, 'user_consents', 'idx_user_consents_userId', 'userId');
    await createIndexIfMissing(connection, 'user_consents', 'idx_user_consents_createdAt', 'createdAt');

    // Refresh token storage (rotation + revocation)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        tokenHash CHAR(64) NOT NULL UNIQUE,
        expiresAt TIMESTAMP NOT NULL,
        revokedAt TIMESTAMP NULL,
        replacedByTokenId VARCHAR(36) NULL,
        createdByIp VARCHAR(80),
        userAgent VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (replacedByTokenId) REFERENCES refresh_tokens(id) ON DELETE SET NULL
      )
    `);

    await createIndexIfMissing(connection, 'refresh_tokens', 'idx_refresh_tokens_userId', 'userId');
    await createIndexIfMissing(connection, 'refresh_tokens', 'idx_refresh_tokens_expiresAt', 'expiresAt');
    await createIndexIfMissing(connection, 'refresh_tokens', 'idx_refresh_tokens_revokedAt', 'revokedAt');

    // Queue jobs (DB-backed queue layer; Redis adapter can sit on top)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR(36) PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        payload JSON,
        status ENUM('queued', 'processing', 'completed', 'failed', 'dead_letter') DEFAULT 'queued',
        attempts INT DEFAULT 0,
        lastError TEXT,
        dlqReason TEXT,
        queueBackend ENUM('database', 'bullmq') DEFAULT 'database',
        runAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await addColumnIfMissing(connection, 'jobs', 'dlqReason', 'TEXT');
    await addColumnIfMissing(connection, 'jobs', 'queueBackend', "ENUM('database', 'bullmq') DEFAULT 'database'");
    await createIndexIfMissing(connection, 'jobs', 'idx_jobs_status', 'status');
    await createIndexIfMissing(connection, 'jobs', 'idx_jobs_runAt', 'runAt');
    await createIndexIfMissing(connection, 'jobs', 'idx_jobs_createdAt', 'createdAt');

    // Idempotency key registry for write APIs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id VARCHAR(36) PRIMARY KEY,
        idempotencyKey VARCHAR(128) NOT NULL,
        method VARCHAR(10) NOT NULL,
        path VARCHAR(255) NOT NULL,
        requestHash CHAR(64) NOT NULL,
        statusCode INT NULL,
        responseBody LONGTEXT NULL,
        completedAt TIMESTAMP NULL,
        expiresAt TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_idempotency_request (idempotencyKey, method, path)
      )
    `);

    await createIndexIfMissing(connection, 'idempotency_keys', 'idx_idempotency_expiresAt', 'expiresAt');
    await createIndexIfMissing(connection, 'idempotency_keys', 'idx_idempotency_createdAt', 'createdAt');

    // Durable retry state for payment reliability and reconciliation
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_retry_jobs (
        id VARCHAR(36) PRIMARY KEY,
        paymentIntentId VARCHAR(36) NOT NULL,
        status ENUM('QUEUED', 'PROCESSING', 'RETRYING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER') DEFAULT 'QUEUED',
        attempts INT DEFAULT 0,
        maxAttempts INT DEFAULT 6,
        lastError TEXT,
        nextRunAt TIMESTAMP NULL,
        lastTriedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (paymentIntentId) REFERENCES payment_intents(id) ON DELETE CASCADE
      )
    `);

    await createIndexIfMissing(connection, 'payment_retry_jobs', 'idx_payment_retry_jobs_intent', 'paymentIntentId');
    await createIndexIfMissing(connection, 'payment_retry_jobs', 'idx_payment_retry_jobs_status', 'status');
    await createIndexIfMissing(connection, 'payment_retry_jobs', 'idx_payment_retry_jobs_nextRunAt', 'nextRunAt');

    logger.info('All tables created successfully');
    connection.release();
    if (options.standalone) {
      await pool.end();
      process.exit(0);
    }
  } catch (error) {
    logger.error('Error initializing database:', error);
    if (options.standalone) process.exit(1);
    throw error;
  }
}

// Run directly (`npm run db:init`) but not when imported by the server (AUTO_INIT_DB).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void initializeDatabase({ standalone: true });
}
