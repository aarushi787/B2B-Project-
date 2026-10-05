// Purpose: This module (backend/src/routes/privacy.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { enqueueJob } from '../services/jobQueue.js';
import { createAuditLog } from '../utils/audit.js';
import { consentRecordSchema, deleteRequestSchema, validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import { withIdempotency } from '../middleware/idempotency.js';

const router = Router();

router.post(
  '/consent',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(consentRecordSchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const purpose = String(req.body.purpose || '').trim();
    if (!purpose) {
      return res.status(400).json({ error: 'purpose is required' });
    }
    const granted = Boolean(req.body.granted);
    const id = uuidv4();

    const connection = pool;
    await connection.query(
      'INSERT INTO user_consents (id, userId, purpose, granted, source) VALUES (?, ?, ?, ?, ?)',
      [id, req.userId, purpose, granted, req.body.source ?? 'web']
    );

    await createAuditLog({
      userId: req.userId,
      companyId: req.companyId,
      action: 'USER_CONSENT_UPDATED',
      resourceType: 'user_consent',
      resourceId: id,
      metadata: { purpose, granted },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ id, purpose, granted });
  } catch (error) {
    logger.error('Create consent error:', error);
    res.status(500).json({ error: 'Failed to save consent' });
  }
  }
);

router.get('/consent', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const connection = pool;
    const [rows] = await connection.query(
      'SELECT id, purpose, granted, source, createdAt FROM user_consents WHERE userId = ? ORDER BY createdAt DESC',
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    logger.error('List consent error:', error);
    res.status(500).json({ error: 'Failed to fetch consents' });
  }
});

router.get('/export-me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const connection = pool;
    const [users] = await connection.query('SELECT id, email, phone, firstName, lastName, role, createdAt FROM users WHERE id = ?', [req.userId]);
    const [companies] = await connection.query('SELECT * FROM companies WHERE userId = ?', [req.userId]);
    const [consents] = await connection.query('SELECT purpose, granted, source, createdAt FROM user_consents WHERE userId = ?', [req.userId]);
    const [requests] = await connection.query('SELECT type, status, reason, createdAt, completedAt FROM gdpr_requests WHERE userId = ?', [req.userId]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: (users as any[])[0] ?? null,
      companies,
      consents,
      gdprRequests: requests,
    };

    const requestId = uuidv4();
    const connection2 = pool;
    await connection2.query(
      `INSERT INTO gdpr_requests (id, userId, type, status, reason, completedAt)
       VALUES (?, ?, 'EXPORT', 'COMPLETED', ?, CURRENT_TIMESTAMP)`,
      [requestId, req.userId, 'Self-service export']
    );

    res.json(exportData);
  } catch (error) {
    logger.error('Export privacy data error:', error);
    res.status(500).json({ error: 'Failed to export user data' });
  }
});

router.post(
  '/delete-request',
  authMiddleware,
  withIdempotency({ required: true, ttlHours: 48 }),
  validateRequest(deleteRequestSchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const id = uuidv4();
    const reason = req.body.reason ?? 'User requested account deletion';
    const connection = pool;
    await connection.query(
      `INSERT INTO gdpr_requests (id, userId, type, status, reason)
       VALUES (?, ?, 'DELETE', 'REQUESTED', ?)`,
      [id, req.userId, reason]
    );

    await enqueueJob({
      type: 'gdpr_delete_request',
      payload: { gdprRequestId: id, userId: req.userId, reason },
    });

    await createAuditLog({
      userId: req.userId,
      companyId: req.companyId,
      action: 'GDPR_DELETE_REQUESTED',
      resourceType: 'gdpr_request',
      resourceId: id,
      metadata: { reason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ id, status: 'REQUESTED' });
  } catch (error) {
    logger.error('Create delete request error:', error);
    res.status(500).json({ error: 'Failed to create delete request' });
  }
  }
);

router.get('/requests', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const connection = pool;
    const [roles] = await connection.query('SELECT role FROM users WHERE id = ?', [req.userId]);
    const role = (roles as any[])[0]?.role;
    const [rows] = role === 'admin'
      ? await connection.query('SELECT * FROM gdpr_requests ORDER BY createdAt DESC LIMIT 500')
      : await connection.query('SELECT * FROM gdpr_requests WHERE userId = ? ORDER BY createdAt DESC LIMIT 200', [req.userId]);
    res.json(rows);
  } catch (error) {
    logger.error('List GDPR requests error:', error);
    res.status(500).json({ error: 'Failed to fetch GDPR requests' });
  }
});

export default router;


