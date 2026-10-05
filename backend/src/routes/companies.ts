// Purpose: This module (backend/src/routes/companies.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { adminMiddleware, authMiddleware, AuthRequest } from '../middleware/auth.js';
import { isValidGst, isValidPan, isValidPhone, trustChecks } from '../services/compliance.js';
import { validateRequest, companyCreateSchema, companyUpdateSchema, emptyBodySchema } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import { createAuditLog } from '../utils/audit.js';
import { notifyCompany } from '../services/notify.js';
import { emitToCompany } from '../realtime/socket.js';
import { withIdempotency } from '../middleware/idempotency.js';

const router = Router();

// Get all companies
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Only admins can list all companies.' });
    }
    const connection = pool;
    const [companies] = await connection.query('SELECT * FROM companies WHERE deletedAt IS NULL');
    res.json(companies);
  } catch (error) {
    logger.error('Get companies error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Business directory for the Explore page: any signed-in user, public fields only (never email, GST, PAN or phone).
// Filters, sorting and paging happen in SQL so the page stays fast as the directory grows.
router.get('/directory', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim().slice(0, 100);
    const location = String(req.query.location ?? '').trim().slice(0, 100);
    const categories = String(req.query.category ?? '').split(',').map((c) => c.trim()).filter(Boolean).slice(0, 10);
    const verifiedOnly = req.query.verified === 'true';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
    const like = (v: string) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;

    const where: string[] = ['deletedAt IS NULL'];
    const params: unknown[] = [];
    if (q) { where.push('(name LIKE ? OR description LIKE ? OR industry LIKE ?)'); params.push(like(q), like(q), like(q)); }
    if (location) { where.push('address LIKE ?'); params.push(like(location)); }
    if (categories.length) { where.push(`(${categories.map(() => 'industry LIKE ?').join(' OR ')})`); params.push(...categories.map(like)); }
    if (verifiedOnly) where.push('verified = TRUE');

    // Whitelisted, never interpolated from user input.
    const ORDER: Record<string, string> = {
      relevance: 'verified DESC, createdAt DESC',
      newest: 'createdAt DESC',
      name: 'name ASC',
      verified: 'verified DESC, name ASC',
    };
    const orderBy = ORDER[String(req.query.sort)] ?? ORDER.relevance;
    const whereSql = where.join(' AND ');

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM companies WHERE ${whereSql}`, params);
    const [rows] = await pool.query(
      `SELECT id, name, industry, description, address, website, verified, gst, createdAt
       FROM companies WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({ data: (rows as any[]).map(({ gst, ...c }) => ({ ...c, trust: trustChecks({ verified: c.verified, gst }) })), total: (countRows as any[])[0]?.total ?? 0, page, limit });
  } catch (error) {
    logger.error('Company directory error:', error);
    res.status(500).json({ error: 'Failed to load businesses' });
  }
});

// Search companies (must be before /:id)
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { q = '' } = req.query as { q?: string };
    const connection = pool;
    
    // For non-admins, we might want to redact sensitive info, but since they are searching to propose deals, 
    // we just return safe info. We'll leave it as is for now, but require authentication.
    const [companies] = await connection.query(
      'SELECT id, name, domain, industry, website FROM companies WHERE deletedAt IS NULL AND (name LIKE ? OR domain LIKE ?) LIMIT 50',
      [`%${q}%`, `%${q}%`]
    );
    res.json(companies);
  } catch (error) {
    logger.error('Search companies error:', error);
    res.status(500).json({ error: 'Failed to search companies' });
  }
});

// Get companies by domain (must be before /:id)
router.get('/domain/:domain', authMiddleware, async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = pool;
    const [companies] = await connection.query('SELECT id, name, domain, industry FROM companies WHERE deletedAt IS NULL AND domain = ?', [req.params.domain]);
    res.json(companies);
  } catch (error) {
    logger.error('Get companies by domain error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  } finally {
  }
});

// Get company by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = pool;
    const [companies] = await connection.query('SELECT * FROM companies WHERE id = ? AND deletedAt IS NULL', [req.params.id]);

    if ((companies as any[]).length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const company = (companies as any)[0];
    company.trust = trustChecks(company);
    
    // Redact sensitive info if not admin and not requesting own company
    if (req.role !== 'admin' && req.companyId !== company.id) {
      delete company.pan;
      delete company.gst;
      delete company.phone;
      delete company.email;
      delete company.address;
    }

    res.json(company);
  } catch (error) {
    logger.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  } finally {
  }
});

// Create company
router.post(
  '/',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(companyCreateSchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    const { name, email, gst, pan, phone, address, website, domain, industry, description } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    if (gst && !isValidGst(String(gst))) {
      return res.status(400).json({
        error: 'Invalid GST format. Expected 15 characters like 27ABCDE1234F1Z5',
      });
    }
    if (pan && !isValidPan(String(pan))) {
      return res.status(400).json({
        error: 'Invalid PAN format. Expected 10 characters like ABCDE1234F',
      });
    }
    if (phone && !isValidPhone(String(phone))) {
      return res.status(400).json({
        error: 'Invalid phone format. Use 8-15 digits, optional leading + (example: +919876543210)',
      });
    }

    connection = pool;
    const companyId = uuidv4();

    await connection.query(
      'INSERT INTO companies (id, name, email, gst, pan, phone, address, website, domain, industry, description, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [companyId, name, email, gst ? String(gst).trim().toUpperCase() : null, pan ? String(pan).trim().toUpperCase() : null, phone ? String(phone).trim() : null, address ?? null, website ?? null, domain ?? null, industry ?? null, description ?? null, req.userId ?? null]
    );

    const [rows] = await connection.query('SELECT * FROM companies WHERE id = ?', [companyId]);
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    logger.error('Create company error:', error);
    res.status(500).json({ error: 'Failed to create company' });
  } finally {
  }
  }
);

// Update company
router.put(
  '/:id',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(companyUpdateSchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    const { name, email, gst, pan, phone, address, website, domain, industry, description } = req.body;
    if (gst && !isValidGst(String(gst))) {
      return res.status(400).json({
        error: 'Invalid GST format. Expected 15 characters like 27ABCDE1234F1Z5',
      });
    }
    if (pan && !isValidPan(String(pan))) {
      return res.status(400).json({
        error: 'Invalid PAN format. Expected 10 characters like ABCDE1234F',
      });
    }
    if (phone && !isValidPhone(String(phone))) {
      return res.status(400).json({
        error: 'Invalid phone format. Use 8-15 digits, optional leading + (example: +919876543210)',
      });
    }
    connection = pool;

    // SECURITY: Verify user owns this company
    const [existing] = await connection.query('SELECT * FROM companies WHERE id = ? AND userId = ? AND deletedAt IS NULL', [req.params.id, req.userId]);
    if ((existing as any[]).length === 0) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this company' });
    }

    await connection.query(
      `UPDATE companies
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           gst = COALESCE(?, gst),
           pan = COALESCE(?, pan),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           website = COALESCE(?, website),
           domain = COALESCE(?, domain),
           industry = COALESCE(?, industry),
           description = COALESCE(?, description)
       WHERE id = ?`,
      [name ?? null, email ?? null, gst ? String(gst).trim().toUpperCase() : null, pan ? String(pan).trim().toUpperCase() : null, phone ? String(phone).trim() : null, address ?? null, website ?? null, domain ?? null, industry ?? null, description ?? null, req.params.id]
    );

    const [rows] = await connection.query('SELECT * FROM companies WHERE id = ? AND deletedAt IS NULL', [req.params.id]);

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json((rows as any[])[0]);
  } catch (error) {
    logger.error('Update company error:', error);
    res.status(500).json({ error: 'Failed to update company' });
  } finally {
  }
  }
);

// Delete company
router.delete(
  '/:id',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = pool;
    
    // SECURITY: Verify user owns this company
    const [existing] = await connection.query('SELECT * FROM companies WHERE id = ? AND userId = ? AND deletedAt IS NULL', [req.params.id, req.userId]);
    if ((existing as any[]).length === 0) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this company' });
    }

    await connection.query('UPDATE companies SET deletedAt = CURRENT_TIMESTAMP WHERE id = ? AND deletedAt IS NULL', [req.params.id]);
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    logger.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  } finally {
  }
  }
);

// Verify company
router.put(
  '/:id/verify',
  adminMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(emptyBodySchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    // `verified: false` revokes a verification; anything else (including no body) verifies.
    const verified = req.body?.verified !== false;
    connection = pool;
    await connection.query('UPDATE companies SET verified = ? WHERE id = ? AND deletedAt IS NULL', [verified, req.params.id]);
    const [rows] = await connection.query('SELECT * FROM companies WHERE id = ? AND deletedAt IS NULL', [req.params.id]);

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const company = (rows as any[])[0];

    await createAuditLog({
      userId: req.userId,
      companyId: company.id,
      action: verified ? 'COMPANY_VERIFIED' : 'COMPANY_VERIFICATION_REVOKED',
      resourceType: 'company',
      resourceId: company.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    void notifyCompany(company.id, {
      kind: verified ? 'COMPANY_VERIFIED' : 'COMPANY_VERIFICATION_REVOKED',
      type: verified ? 'success' : 'warning',
      title: verified ? 'Your business is verified' : 'Verification removed',
      message: verified ? 'Your business now shows the verified badge.' : 'The verified badge was removed from your business. Contact support if you think this is a mistake.',
      link: '/app/verification',
    });
    emitToCompany(company.id, 'company:updated', { id: company.id, verified });

    res.json(company);
  } catch (error) {
    logger.error('Verify company error:', error);
    res.status(500).json({ error: 'Failed to verify company' });
  } finally {
  }
  }
);

export default router;
