// Purpose: This module (backend/src/routes/reputation.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';
import { reputationEventSchema, validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

const router = Router();

// A rating is a company's honest word about a company it has actually done a deal with:
// the reviewer is always the caller's company, the deal must be completed, and each side can rate once per deal.
router.post('/events', authMiddleware, validateRequest(reputationEventSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, dealId, score, comment } = req.body;
    const reviewer = req.companyId;
    if (!reviewer) return res.status(403).json({ error: 'Your account needs a company before you can leave a rating' });
    if (!dealId) return res.status(400).json({ error: 'A rating must refer to a deal' });
    if (companyId === reviewer) return res.status(400).json({ error: 'You cannot rate your own company' });

    const [deals] = await pool.query("SELECT buyerId, sellerId, status FROM deals WHERE id = ? AND deletedAt IS NULL", [dealId]);
    const deal = (deals as any[])[0];
    const parties = deal ? [deal.buyerId, deal.sellerId] : [];
    // Same answer whether the deal does not exist or the caller is not part of it.
    if (!deal || !parties.includes(reviewer) || !parties.includes(companyId)) return res.status(404).json({ error: 'Deal not found' });
    if (deal.status !== 'completed') return res.status(409).json({ error: 'You can rate the other company once the deal is completed' });

    const [already] = await pool.query('SELECT id FROM reputation_events WHERE dealId = ? AND counterpartyCompanyId = ? LIMIT 1', [dealId, reviewer]);
    if ((already as any[]).length > 0) return res.status(409).json({ error: 'You have already rated this deal' });

    const id = uuidv4();
    // companyId is who is rated; counterpartyCompanyId is who rated them.
    await pool.query(
      `INSERT INTO reputation_events (id, companyId, counterpartyCompanyId, dealId, score, comment, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, companyId, reviewer, dealId, score, comment ?? null, req.userId ?? null]
    );

    await createAuditLog({
      userId: req.userId,
      companyId,
      action: 'REPUTATION_EVENT_CREATED',
      resourceType: 'reputation_event',
      resourceId: id,
      metadata: { score, dealId },
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
    const connection = pool;
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


