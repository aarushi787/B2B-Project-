// Purpose: This module (backend/src/routes/audit.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Response } from 'express';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

async function isAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT role FROM users WHERE id = ?', [userId]);
    const row = (rows as any[])[0];
    return row?.role === 'admin';
  } finally {
    connection.release();
  }
}

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const admin = await isAdmin(req.userId);
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const connection = await pool.getConnection();
    const [rows] = admin
      ? await connection.query(
          `SELECT id, userId, companyId, action, resourceType, resourceId, metadata, ipAddress, userAgent, createdAt
           FROM audit_logs
           ORDER BY createdAt DESC
           LIMIT ?`,
          [limit]
        )
      : await connection.query(
          `SELECT id, userId, companyId, action, resourceType, resourceId, metadata, ipAddress, userAgent, createdAt
           FROM audit_logs
           WHERE userId = ? OR companyId = ?
           ORDER BY createdAt DESC
           LIMIT ?`,
          [req.userId ?? null, req.companyId ?? null, limit]
        );
    connection.release();
    res.json({ admin, count: (rows as any[]).length, logs: rows });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;


