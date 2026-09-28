// Purpose: This module (backend/src/routes/ledger.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { ledgerCreateSchema, validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

const router = Router();

function toDbType(type?: string) {
  switch ((type || '').toUpperCase()) {
    case 'CREDIT': return 'credit';
    case 'PAYOUT': return 'credit';
    case 'COMMISSION': return 'credit';
    case 'DEBIT': return 'debit';
    case 'ESCROW_DEPOSIT': return 'debit';
    case 'REFUND': return 'debit';
    default: return 'debit';
  }
}

function toFrontendType(type?: string) {
  return (type || '').toLowerCase() === 'credit' ? 'PAYOUT' : 'ESCROW_DEPOSIT';
}

function mapLedger(row: any) {
  return {
    id: row.id,
    dealId: row.dealId || '',
    amount: Number(row.amount || 0),
    type: toFrontendType(row.type),
    timestamp: row.createdAt,
    status: 'COMPLETED',
    counterparty: row.description || row.companyId,
  };
}

// Get all ledger entries
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Only admins can view the entire ledger.' });
    }
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM ledger ORDER BY createdAt DESC');
    connection.release();
    res.json((rows as any[]).map(mapLedger));
  } catch (error) {
    logger.error('Get ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
});

// Get company ledger entries
router.get('/company/:companyId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.role !== 'admin' && req.companyId !== req.params.companyId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM ledger WHERE companyId = ? ORDER BY createdAt DESC', [req.params.companyId]);
    connection.release();
    res.json((rows as any[]).map(mapLedger));
  } catch (error) {
    logger.error('Get company ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
});

// Get deal ledger entries
router.get('/deal/:dealId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const connection = await pool.getConnection();
    
    // Auth check: must be admin or a party to the deal
    if (req.role !== 'admin') {
      const [dealRows] = await connection.query('SELECT buyerId, sellerId FROM deals WHERE id = ?', [req.params.dealId]);
      const deal = (dealRows as any[])[0];
      if (!deal || (deal.buyerId !== req.companyId && deal.sellerId !== req.companyId)) {
        connection.release();
        return res.status(403).json({ error: 'Forbidden.' });
      }
    }

    const [rows] = await connection.query('SELECT * FROM ledger WHERE dealId = ? ORDER BY createdAt DESC', [req.params.dealId]);
    connection.release();
    res.json((rows as any[]).map(mapLedger));
  } catch (error) {
    logger.error('Get deal ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger entries' });
  }
});

// Create ledger entry
router.post('/', authMiddleware, validateRequest(ledgerCreateSchema), async (req: AuthRequest, res: Response) => {
  try {
    // Only admins should be able to manually create ledger entries
    if (req.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Only system admins can manually create ledger records.' });
    }
    const companyId = req.body.companyId;
    const dealId = req.body.dealId;
    const amount = req.body.amount;
    const type = toDbType(req.body.type);
    const description = req.body.description ?? req.body.counterparty ?? null;

    if (!companyId || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'companyId and amount are required' });
    }

    const connection = await pool.getConnection();
    const entryId = uuidv4();

    await connection.query(
      'INSERT INTO ledger (id, companyId, dealId, type, amount, description) VALUES (?, ?, ?, ?, ?, ?)',
      [entryId, companyId, dealId ?? null, type, amount, description]
    );

    const [rows] = await connection.query('SELECT * FROM ledger WHERE id = ?', [entryId]);
    connection.release();
    res.status(201).json(mapLedger((rows as any[])[0]));
  } catch (error) {
    logger.error('Create ledger entry error:', error);
    res.status(500).json({ error: 'Failed to create ledger entry' });
  }
});

// Get company balance
router.get('/balance/:companyId', async (req: Request, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(
      'SELECT SUM(CASE WHEN type = "credit" THEN amount ELSE -amount END) as balance FROM ledger WHERE companyId = ?',
      [req.params.companyId]
    );
    connection.release();

    const balance = Number((result as any[])[0]?.balance || 0);
    res.json({ companyId: req.params.companyId, balance, currency: 'USD' });
  } catch (error) {
    logger.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Get entries by type
router.get('/company/:companyId/type/:type', async (req: Request, res: Response) => {
  try {
    const { companyId, type } = req.params;
    const dbType = toDbType(type);

    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM ledger WHERE companyId = ? AND type = ? ORDER BY createdAt DESC',
      [companyId, dbType]
    );
    connection.release();
    res.json((rows as any[]).map(mapLedger));
  } catch (error) {
    logger.error('Get entries by type error:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Get monthly report
router.get('/company/:companyId/month/:month', async (req: Request, res: Response) => {
  try {
    const { companyId, month } = req.params;
    const connection = await pool.getConnection();

    const [rows] = await connection.query(
      'SELECT * FROM ledger WHERE companyId = ? AND DATE_FORMAT(createdAt, "%Y-%m") = ? ORDER BY createdAt DESC',
      [companyId, month]
    );

    connection.release();
    res.json((rows as any[]).map(mapLedger));
  } catch (error) {
    logger.error('Get monthly report error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly report' });
  }
});

export default router;

