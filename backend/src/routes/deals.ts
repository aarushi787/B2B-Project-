// Purpose: This module (backend/src/routes/deals.ts) is used to implement deal lifecycle APIs and updates in a modular, maintainable way.
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { adminMiddleware, authMiddleware, AuthRequest } from '../middleware/auth.js';
import { canChangeDealStatus, canEditDealTerms, sideOfDeal } from '../utils/dealAccess.js';
import { dealCreateSchema, dealStatusUpdateSchema, dealUpdateSchema, emptyBodySchema, validateRequest } from '../middleware/validation.js';
import { requireCompanyRole } from '../middleware/rbac.js';
import { withIdempotency } from '../middleware/idempotency.js';
import { emitToCompany, emitToDeal } from '../realtime/socket.js';
import { checkDealParties } from '../utils/dealParties.js';
import { logger } from '../utils/logger.js';

const router = Router();

function toFrontendStatus(status: string) {
  switch ((status || '').toLowerCase()) {
    case 'approved': return 'CONFIRMED';
    case 'completed': return 'COMPLETED';
    case 'rejected': return 'VOIDED';
    case 'cancelled': return 'VOIDED';
    case 'pending':
    default:
      return 'ENQUIRY';
  }
}

function toDbStatus(status?: string) {
  switch ((status || '').toUpperCase()) {
    case 'CONFIRMED': return 'approved';
    case 'COMPLETED': return 'completed';
    case 'VOIDED':
    case 'REJECTED': return 'rejected';
    case 'CANCELLED': return 'cancelled';
    case 'ENQUIRY':
    case 'NEGOTIATION':
    case 'IN_PRODUCTION':
    case 'SHIPPED':
    case 'DISPUTED':
    case 'FROZEN':
    default:
      return 'pending';
  }
}

function mapDealRow(row: any) {
  return {
    id: row.id,
    buyerId: row.buyerId,
    sellerIds: row.sellerId ? [row.sellerId] : [],
    productId: row.productId,
    status: toFrontendStatus(row.status),
    amount: Number(row.totalAmount || 0),
    platformFee: Number(row.totalAmount || 0) * 0.05,
    payoutAmount: Number(row.totalAmount || 0) * 0.95,
    revenueSplits: row.sellerId ? [{ companyId: row.sellerId, percentage: 100 }] : [],
    milestones: [],
    contracts: [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    notes: row.description || row.title || '',
    escrowStatus: 'UNFUNDED',
    riskScore: undefined,
    completionProbability: undefined,
  };
}

function emitDealEvent(event: string, deal: ReturnType<typeof mapDealRow>) {
  emitToCompany(deal.buyerId, event, deal);
  for (const sellerId of deal.sellerIds) {
    emitToCompany(sellerId, event, deal);
  }
  emitToDeal(deal.id, event, deal);
}

async function getDealById(id: string) {
  const connection = pool;
  const [rows] = await connection.query('SELECT * FROM deals WHERE id = ? AND deletedAt IS NULL', [id]);
  return (rows as any[])[0];
}

// Get all deals
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM deals WHERE deletedAt IS NULL';
    let params: any[] = [];

    if (req.role !== 'admin') {
      if (!req.companyId) return res.status(403).json({ error: 'Company association required' });
      query += ' AND (buyerId = ? OR sellerId = ?)';
      params.push(req.companyId, req.companyId);
    }
    
    if (req.query.status) {
      query += ' AND status = ?';
      params.push(toDbStatus(req.query.status as string));
    }
    
    // Total count
    const connection = pool;
    const [countRows] = await connection.query(query.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
    const total = (countRows as any[])[0].total;
    
    // Paginated items
    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await connection.query(query, params);
    
    res.json({
      data: (rows as any[]).map(mapDealRow),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Get deals error:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get deals by buyer (must be before /:id)
router.get('/buyer/:buyerId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.role !== 'admin' && req.companyId !== req.params.buyerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    const connection = pool;
    const [countRows] = await connection.query('SELECT COUNT(*) as total FROM deals WHERE deletedAt IS NULL AND buyerId = ?', [req.params.buyerId]);
    const total = (countRows as any[])[0].total;

    const [rows] = await connection.query('SELECT * FROM deals WHERE deletedAt IS NULL AND buyerId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?', [req.params.buyerId, limit, offset]);

    res.json({
      data: (rows as any[]).map(mapDealRow),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Get buyer deals error:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get deals by seller (must be before /:id)
router.get('/seller/:sellerId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.role !== 'admin' && req.companyId !== req.params.sellerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const offset = (page - 1) * limit;

    const connection = pool;
    const [countRows] = await connection.query('SELECT COUNT(*) as total FROM deals WHERE deletedAt IS NULL AND sellerId = ?', [req.params.sellerId]);
    const total = (countRows as any[])[0].total;

    const [rows] = await connection.query('SELECT * FROM deals WHERE deletedAt IS NULL AND sellerId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?', [req.params.sellerId, limit, offset]);

    res.json({
      data: (rows as any[]).map(mapDealRow),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Get seller deals error:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get deals by status (must be before /:id)
router.get('/status/:status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const dbStatus = toDbStatus(req.params.status);
    let query = 'SELECT * FROM deals WHERE deletedAt IS NULL AND status = ?';
    let params: any[] = [dbStatus];

    if (req.role !== 'admin') {
      if (!req.companyId) return res.status(403).json({ error: 'Company association required' });
      query += ' AND (buyerId = ? OR sellerId = ?)';
      params.push(req.companyId, req.companyId);
    }
    query += ' ORDER BY createdAt DESC LIMIT 100';

    const connection = pool;
    const [rows] = await connection.query(query, params);
    res.json((rows as any[]).map(mapDealRow));
  } catch (error) {
    logger.error('Get deals by status error:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get deal by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const row = await getDealById(req.params.id);
    if (!row) return res.status(404).json({ error: 'Deal not found' });
    if (req.role !== 'admin' && row.buyerId !== req.companyId && row.sellerId !== req.companyId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(mapDealRow(row));
  } catch (error) {
    logger.error('Get deal error:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// Create deal
router.post(
  '/',
  authMiddleware,
  requireCompanyRole(['OPS', 'OWNER', 'ADMIN']),
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(dealCreateSchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const sellerId = req.body.sellerId ?? req.body.sellerIds?.[0];
    const buyerId = req.body.buyerId;

    if (!buyerId || !sellerId) {
      return res.status(400).json({ error: 'buyerId and sellerId/sellerIds[0] are required' });
    }

    const parties = checkDealParties({
      buyerId,
      sellerIds: req.body.sellerIds ?? [sellerId],
      callerCompanyId: req.companyId,
      isPlatformAdmin: req.role === 'admin',
    });
    if (!parties.ok) {
      return res.status(parties.status).json({ error: parties.message });
    }

    const title = req.body.title ?? req.body.notes ?? 'Deal';
    const description = req.body.description ?? req.body.notes ?? '';
    const quantity = req.body.quantity ?? 1;
    const totalAmount = req.body.totalAmount ?? req.body.amount ?? 0;
    const status = toDbStatus(req.body.status);

    const connection = pool;
    const dealId = uuidv4();

    await connection.query(
      'INSERT INTO deals (id, title, description, buyerId, sellerId, productId, quantity, totalAmount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [dealId, title, description, buyerId, sellerId, req.body.productId ?? null, quantity, totalAmount, status]
    );

    const [rows] = await connection.query('SELECT * FROM deals WHERE id = ?', [dealId]);
    const deal = mapDealRow((rows as any[])[0]);
    emitDealEvent('deals:updated', deal);
    res.status(201).json(deal);
  } catch (error) {
    logger.error('Create deal error:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
  }
);

// Update deal
router.put(
  '/:id',
  authMiddleware,
  requireCompanyRole(['OPS', 'OWNER', 'ADMIN']),
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(dealUpdateSchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const connection = pool;
    const [rows] = await connection.query('SELECT * FROM deals WHERE id = ? AND deletedAt IS NULL', [req.params.id]);
    const existing = (rows as any[])[0];

    const isAdmin = req.role === 'admin';
    const edit = existing ? canEditDealTerms({ isAdmin, side: sideOfDeal(existing, req.companyId), status: existing.status }) : ({ ok: false, status: 404, message: 'Deal not found' } as const);
    if (!existing || !edit.ok) {
      const e = edit.ok ? { status: 404, message: 'Deal not found' } : edit;
      return res.status(e.status).json({ error: e.message });
    }

    const title = req.body.title ?? existing.title;
    const description = req.body.description ?? req.body.notes ?? existing.description;
    const quantity = req.body.quantity ?? existing.quantity;
    const totalAmount = req.body.totalAmount ?? req.body.amount ?? existing.totalAmount;
    // Status is the platform's call: only a platform admin may change it through this route.
    const status = isAdmin && req.body.status ? toDbStatus(req.body.status) : existing.status;

    await connection.query(
      'UPDATE deals SET title = ?, description = ?, quantity = ?, totalAmount = ?, status = ? WHERE id = ?',
      [title, description, quantity, totalAmount, status, req.params.id]
    );

    const [updatedRows] = await connection.query('SELECT * FROM deals WHERE id = ? AND deletedAt IS NULL', [req.params.id]);
    const deal = mapDealRow((updatedRows as any[])[0]);
    emitDealEvent('deals:updated', deal);
    res.json(deal);
  } catch (error) {
    logger.error('Update deal error:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
  }
);

// Delete deal
router.delete(
  '/:id',
  authMiddleware,
  requireCompanyRole(['OPS', 'OWNER', 'ADMIN']),
  withIdempotency({ required: false, ttlHours: 24 }),
  async (req: AuthRequest, res: Response) => {
  try {
    const connection = pool;
    const [rows] = await connection.query('SELECT * FROM deals WHERE id = ? AND deletedAt IS NULL', [req.params.id]);
    const existing = (rows as any[])[0];
    if (!existing || (req.role !== 'admin' && !sideOfDeal(existing, req.companyId))) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    await connection.query('UPDATE deals SET deletedAt = CURRENT_TIMESTAMP WHERE id = ? AND deletedAt IS NULL', [req.params.id]);
    const deal = mapDealRow(existing);
    emitDealEvent('deals:deleted', deal);
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    logger.error('Delete deal error:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
  }
);

// Update deal status
router.put(
  '/:id/status',
  authMiddleware,
  requireCompanyRole(['OPS', 'OWNER', 'ADMIN']),
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(dealStatusUpdateSchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const status = toDbStatus(req.body.status);
    const connection = pool;
    const [current] = await connection.query('SELECT * FROM deals WHERE id = ? AND deletedAt IS NULL', [req.params.id]);
    const existing = (current as any[])[0];
    const verdict = existing
      ? canChangeDealStatus({ isAdmin: req.role === 'admin', side: sideOfDeal(existing, req.companyId), from: existing.status, to: status })
      : ({ ok: false, status: 404, message: 'Deal not found' } as const);
    if (!verdict.ok) {
      return res.status(verdict.status).json({ error: verdict.message });
    }
    // The old status is part of the WHERE, so two people changing it at once cannot both succeed.
    await connection.query('UPDATE deals SET status = ? WHERE id = ? AND status = ? AND deletedAt IS NULL', [status, req.params.id, existing.status]);
    const [rows] = await connection.query('SELECT * FROM deals WHERE id = ? AND deletedAt IS NULL', [req.params.id]);

    if ((rows as any[]).length === 0) return res.status(404).json({ error: 'Deal not found' });
    const deal = mapDealRow((rows as any[])[0]);
    emitDealEvent('deals:updated', deal);
    res.json(deal);
  } catch (error) {
    logger.error('Update deal status error:', error);
    res.status(500).json({ error: 'Failed to update deal status' });
  }
  }
);

// Approve deal
router.put(
  '/:id/approve',
  adminMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(emptyBodySchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const connection = pool;
    await connection.query('UPDATE deals SET status = ? WHERE id = ? AND deletedAt IS NULL', ['approved', req.params.id]);
    const [rows] = await connection.query('SELECT * FROM deals WHERE id = ? AND deletedAt IS NULL', [req.params.id]);

    if ((rows as any[]).length === 0) return res.status(404).json({ error: 'Deal not found' });
    const deal = mapDealRow((rows as any[])[0]);
    emitDealEvent('deals:updated', deal);
    res.json(deal);
  } catch (error) {
    logger.error('Approve deal error:', error);
    res.status(500).json({ error: 'Failed to approve deal' });
  }
  }
);

// Reject deal
router.put(
  '/:id/reject',
  adminMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(emptyBodySchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = pool;
    await connection.query('UPDATE deals SET status = ? WHERE id = ? AND deletedAt IS NULL', ['rejected', req.params.id]);
    const [rows] = await connection.query('SELECT * FROM deals WHERE id = ? AND deletedAt IS NULL', [req.params.id]);

    if ((rows as any[]).length === 0) return res.status(404).json({ error: 'Deal not found' });
    const deal = mapDealRow((rows as any[])[0]);
    emitDealEvent('deals:updated', deal);
    res.json(deal);
  } catch (error) {
    logger.error('Reject deal error:', error);
    res.status(500).json({ error: 'Failed to reject deal' });
  } finally {
  }
  }
);

export default router;
