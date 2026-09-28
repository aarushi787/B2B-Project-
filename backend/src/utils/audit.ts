// Purpose: This module (backend/src/utils/audit.ts) is used to implement project functionality in a modular, maintainable way.
import pool from '../config/database.js';

type AuditLogInput = {
  userId?: string;
  companyId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
};

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `INSERT INTO audit_logs (id, userId, companyId, action, resourceType, resourceId, metadata, ipAddress, userAgent)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.userId ?? null,
        input.companyId ?? null,
        input.action,
        input.resourceType ?? null,
        input.resourceId ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
      ]
    );
  } finally {
    connection.release();
  }
}


