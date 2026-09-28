// Purpose: This module (backend/src/routes/reputation.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';
import { reputationEventSchema, validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/events', authMiddleware, validateRequest(reputationEventSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, counterpartyCompanyId, dealId, score, comment } = req.body;
    if (!companyId || typeof score !== 'number') {
      return res.status(400).json({ error: 'companyId and numeric score are required' });
    }
    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'score must be between 1 and 5' });
    }

    const id = uuidv4();
    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO reputation_events (id, companyId, counterpartyCompanyId, dealId, score, comment, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, counterpartyCompanyId ?? null, dealId ?? null, score, comment ?? null, req.userId ?? null]
    );
    connection.release();

    await createAuditLog({
      userId: req.userId,
      companyId,
      action: 'REPUTATION_EVENT_CREATED',
      resourceType: 'reputation_event',
      resourceId: id,
      metadata: { score, dealId: dealId ?? null },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ id, companyId, score });
  } catch (error) {
    logger.error('Create reputation event error:', error);
    res.status(500).json({ error: 'Failed to create reputation event' });
  }
});

router.get('/company/:companyId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, companyId, counterpartyCompanyId, dealId, score, comment, createdBy, createdAt
       FROM reputation_events
       WHERE companyId = ?
       ORDER BY createdAt DESC`,
      [req.params.companyId]
    );

    const [summaryRows] = await connection.query(
      `SELECT COUNT(*) as totalReviews, AVG(score) as averageScore, MIN(score) as minScore, MAX(score) as maxScore
       FROM reputation_events
       WHERE companyId = ?`,
      [req.params.companyId]
    );
    connection.release();

    res.json({
      events: rows,
      summary: (summaryRows as any[])[0] ?? { totalReviews: 0, averageScore: null, minScore: null, maxScore: null },
    });
  } catch (error) {
    logger.error('Get reputation error:', error);
    res.status(500).json({ error: 'Failed to fetch reputation' });
  }
});

export default router;


