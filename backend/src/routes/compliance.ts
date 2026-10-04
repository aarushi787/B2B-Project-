// Purpose: This module (backend/src/routes/compliance.ts) is used to implement compliance verification APIs and related checks in a modular, maintainable way.
import { Router, Response } from 'express';
import pool from '../config/database.js';
import { adminMiddleware, authMiddleware, AuthRequest } from '../middleware/auth.js';
import { isValidPan, verifyGstNumber } from '../services/compliance.js';
import { gstVerifySchema, panVerifySchema, validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/gst/verify', authMiddleware, validateRequest(gstVerifySchema), async (req: AuthRequest, res: Response) => {
  try {
    const gstNumber = String(req.body.gstNumber || '').trim().toUpperCase();
    if (!gstNumber) {
      return res.status(400).json({ error: 'gstNumber is required' });
    }
    const result = await verifyGstNumber(gstNumber);
    res.json({ gstNumber, ...result });
  } catch (error) {
    logger.error('GST verify error:', error);
    res.status(500).json({ error: 'Failed to verify GST number' });
  }
});

router.post('/pan/verify', authMiddleware, validateRequest(panVerifySchema), async (req: AuthRequest, res: Response) => {
  try {
    const panNumber = String(req.body.panNumber || '').trim().toUpperCase();
    if (!panNumber) {
      return res.status(400).json({ error: 'panNumber is required' });
    }
    const valid = isValidPan(panNumber);
    res.json({
      panNumber,
      verified: valid,
      source: 'regex',
      details: valid ? { message: 'PAN format verified' } : { reason: 'Invalid PAN format. Expected ABCDE1234F' },
    });
  } catch (error) {
    logger.error('PAN verify error:', error);
    res.status(500).json({ error: 'Failed to verify PAN number' });
  }
});

router.get('/aml-checks', adminMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, dealId, escrowId, companyId, amount, currency, riskScore, riskLevel, decision, reason, createdAt
       FROM aml_checks
       ORDER BY createdAt DESC
       LIMIT 200`
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    logger.error('List AML checks error:', error);
    res.status(500).json({ error: 'Failed to fetch AML checks' });
  }
});

export default router;


