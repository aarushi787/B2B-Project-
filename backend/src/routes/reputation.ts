// Purpose: This module (backend/src/routes/reputation.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';
import { reputationEventSchema, validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import { notifyCompany } from '../services/notify.js';

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

    void notifyCompany(companyId, { kind: 'REVIEW_RECEIVED', title: 'You received a review', message: `A business rated its deal with you ${score} out of 5.`, type: 'info', link: `/app/deals/${dealId}` });
    res.status(201).json({ id, companyId, score });
  } catch (error) {
    logger.error('Create reputation event error:', error);
    res.status(500).json({ error: 'Failed to create reputation event' });
  }
});

// Reviews other businesses left for a company, with who wrote them and which deal they were about.
router.get('/company/:companyId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.companyId, e.counterpartyCompanyId, e.dealId, e.score, e.comment, e.createdAt,
              rc.name AS reviewerName, rc.verified AS reviewerVerified, d.title AS dealTitle
       FROM reputation_events e
       LEFT JOIN companies rc ON rc.id = e.counterpartyCompanyId
       LEFT JOIN deals d ON d.id = e.dealId
       WHERE e.companyId = ?
       ORDER BY e.createdAt DESC
       LIMIT 100`,
      [req.params.companyId]
    );
    const [summaryRows] = await pool.query(
      `SELECT COUNT(*) AS totalReviews, AVG(score) AS averageScore, MIN(score) AS minScore, MAX(score) AS maxScore
       FROM reputation_events WHERE companyId = ?`,
      [req.params.companyId]
    );
    const summary = (summaryRows as any[])[0] ?? {};
    res.json({
      events: (rows as any[]).map((r) => ({ ...r, reviewerVerified: Boolean(r.reviewerVerified) })),
      summary: {
        totalReviews: Number(summary.totalReviews) || 0,
        averageScore: summary.averageScore == null ? null : Math.round(Number(summary.averageScore) * 10) / 10,
        minScore: summary.minScore ?? null,
        maxScore: summary.maxScore ?? null,
      },
    });
  } catch (error) {
    logger.error('Get reputation error:', error);
    res.status(500).json({ error: 'Failed to fetch reputation' });
  }
});

// Completed deals where the caller's company has not yet rated the other side: the "leave a review" to-do list.
router.get('/pending', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId) return res.json([]);
    const [rows] = await pool.query(
      `SELECT d.id AS dealId, d.title AS dealTitle,
              IF(d.buyerId = ?, d.sellerId, d.buyerId) AS companyId,
              c.name AS companyName
       FROM deals d
       JOIN companies c ON c.id = IF(d.buyerId = ?, d.sellerId, d.buyerId)
       WHERE d.status = 'completed' AND d.deletedAt IS NULL AND (d.buyerId = ? OR d.sellerId = ?)
         AND NOT EXISTS (SELECT 1 FROM reputation_events e WHERE e.dealId = d.id AND e.counterpartyCompanyId = ?)
       ORDER BY d.createdAt DESC LIMIT 50`,
      [req.companyId, req.companyId, req.companyId, req.companyId, req.companyId]
    );
    res.json(rows);
  } catch (error) {
    logger.error('Pending reviews error:', error);
    res.status(500).json({ error: 'Failed to load pending reviews' });
  }
});

// What each side said about one deal (both parties may read it; nobody else).
router.get('/deal/:dealId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [deals] = await pool.query('SELECT buyerId, sellerId FROM deals WHERE id = ? AND deletedAt IS NULL', [req.params.dealId]);
    const deal = (deals as any[])[0];
    if (!deal || !req.companyId || ![deal.buyerId, deal.sellerId].includes(req.companyId)) return res.status(404).json({ error: 'Deal not found' });
    const [rows] = await pool.query(
      'SELECT id, companyId, counterpartyCompanyId, score, comment, createdAt FROM reputation_events WHERE dealId = ?',
      [req.params.dealId]
    );
    res.json({ given: (rows as any[]).find((r) => r.counterpartyCompanyId === req.companyId) ?? null, received: (rows as any[]).find((r) => r.companyId === req.companyId) ?? null });
  } catch (error) {
    logger.error('Deal reviews error:', error);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

export default router;


