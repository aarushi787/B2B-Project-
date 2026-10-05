// Purpose: This module (backend/src/routes/admin.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { adminCreateUserSchema, adminUpdateUserSchema, validateRequest } from '../middleware/validation.js';
import { toDbRole, normalizeAccountRole } from '../utils/roles.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';
import { trustChecks } from '../services/compliance.js';
import { createAuditLog } from '../utils/audit.js';
import { emitToUser } from '../realtime/socket.js';
import { csvCell } from '../utils/csv.js';
import { notifyCompany } from '../services/notify.js';
import { emitToCompany } from '../realtime/socket.js';
import { getQueue, isBullMqEnabled, DLQ_QUEUE, PAYMENT_RETRY_QUEUE } from '../services/queue.js';

const suspendSchema = z.object({ suspended: z.boolean(), reason: z.string().trim().max(255).optional() });

const router = Router();
// Platform admins only (users.role === 'admin'). Company-level OWNER/ADMIN roles must NOT grant access here.
const adminAccess = [adminMiddleware] as const;

// --- Approvals and live activity ---

// Documents waiting for review (oldest first), then the most recently decided ones.
router.get('/approvals', ...adminAccess, async (_req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.companyId, c.name AS companyName, d.documentType, d.status, d.createdAt, d.verifiedAt,
              u.email AS uploadedByEmail
       FROM kyc_documents d
       LEFT JOIN companies c ON c.id = d.companyId
       LEFT JOIN users u ON u.id = d.uploadedBy
       ORDER BY (d.status = 'PENDING') DESC, d.createdAt DESC
       LIMIT 200`
    );
    res.json(rows);
  } catch (error) {
    logger.error('Admin approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

// What users did recently (registrations, requirements, proposals, deals, documents).
router.get('/activity', ...adminAccess, async (_req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.action, a.resourceType, a.resourceId, a.metadata, a.createdAt, u.email AS actorEmail
       FROM audit_logs a LEFT JOIN users u ON u.id = a.userId
       ORDER BY a.createdAt DESC LIMIT 100`
    );
    res.json((rows as any[]).map((r) => ({ ...r, metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata })));
  } catch (error) {
    logger.error('Admin activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});


// --- Review queue: everything waiting for an admin decision, in one list ---

const reviewDecisionSchema = z.object({
  items: z.array(z.object({ kind: z.enum(['document', 'company']), id: z.string().uuid() })).min(1).max(50),
  decision: z.enum(['approve', 'reject']),
  reason: z.string().trim().max(500).optional(),
});

// Pending KYC documents and unverified companies, oldest first, so nothing waits forever.
router.get('/review-queue', ...adminAccess, async (_req: AuthRequest, res: Response) => {
  try {
    const [docs] = await pool.query(
      `SELECT d.id, d.companyId, c.name AS companyName, d.documentType AS title, u.email AS submittedBy, d.createdAt
       FROM kyc_documents d
       LEFT JOIN companies c ON c.id = d.companyId
       LEFT JOIN users u ON u.id = d.uploadedBy
       WHERE d.status = 'PENDING'
       ORDER BY d.createdAt ASC LIMIT 200`
    );
    const [companies] = await pool.query(
      `SELECT c.id, c.id AS companyId, c.name AS companyName, c.industry, c.gst, u.email AS submittedBy, c.createdAt
       FROM companies c
       LEFT JOIN users u ON u.id = c.userId
       WHERE c.verified = FALSE AND c.deletedAt IS NULL
       ORDER BY c.createdAt ASC LIMIT 200`
    );
    const items = [
      ...(docs as any[]).map((d) => ({ kind: 'document' as const, ...d, detail: null })),
      ...(companies as any[]).map((c) => ({
        kind: 'company' as const, id: c.id, companyId: c.companyId, companyName: c.companyName, title: 'Company verification',
        detail: [c.industry, c.gst && `GST ${c.gst}`].filter(Boolean).join(' · ') || null, submittedBy: c.submittedBy, createdAt: c.createdAt,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json({ counts: { documents: (docs as any[]).length, companies: (companies as any[]).length }, items });
  } catch (error) {
    logger.error('Admin review queue error:', error);
    res.status(500).json({ error: 'Failed to load the review queue' });
  }
});

// Approve or reject several queue items at once. Each item succeeds or fails on its own and is audited.
router.post('/review-queue/decide', ...adminAccess, validateRequest(reviewDecisionSchema), async (req: AuthRequest, res: Response) => {
  const { items, decision, reason } = req.body as z.infer<typeof reviewDecisionSchema>;
  const approve = decision === 'approve';
  if (!approve && !reason) return res.status(400).json({ error: 'A reason is required when rejecting' });
  const why = reason ? ` Reason: ${reason}` : '';
  const results: { id: string; kind: string; ok: boolean; error?: string }[] = [];

  for (const item of items) {
    try {
      if (item.kind === 'document') {
        const status = approve ? 'VERIFIED' : 'REJECTED';
        const [rows] = await pool.query("SELECT id, companyId, documentType FROM kyc_documents WHERE id = ? AND status = 'PENDING'", [item.id]);
        const doc = (rows as any[])[0];
        if (!doc) { results.push({ ...item, ok: false, error: 'Already decided or not found' }); continue; }
        await pool.query('UPDATE kyc_documents SET status = ?, verifierUserId = ?, verifiedAt = CURRENT_TIMESTAMP WHERE id = ?', [status, req.userId ?? null, item.id]);
        await createAuditLog({ userId: req.userId, companyId: doc.companyId, action: `KYC_DOCUMENT_${status}`, resourceType: 'kyc_document', resourceId: item.id, metadata: { status, reason: reason ?? null, bulk: items.length > 1 }, ipAddress: req.ip, userAgent: req.get('user-agent') });
        void notifyCompany(doc.companyId, {
          kind: `DOCUMENT_${status}`, type: approve ? 'success' : 'warning',
          title: approve ? 'Document approved' : 'Document rejected',
          message: `Your ${doc.documentType} document was ${approve ? 'approved' : 'rejected'}.${why}`, link: '/app/contracts',
        });
        emitToCompany(doc.companyId, 'kyc:updated', { id: doc.id, status });
      } else {
        const [rows] = await pool.query('SELECT id, name FROM companies WHERE id = ? AND deletedAt IS NULL', [item.id]);
        const company = (rows as any[])[0];
        if (!company) { results.push({ ...item, ok: false, error: 'Company not found' }); continue; }
        // There is no "rejected" company state: rejecting leaves it unverified and tells the company why.
        if (approve) await pool.query('UPDATE companies SET verified = TRUE WHERE id = ?', [item.id]);
        await createAuditLog({ userId: req.userId, companyId: item.id, action: approve ? 'COMPANY_VERIFIED' : 'COMPANY_VERIFICATION_DECLINED', resourceType: 'company', resourceId: item.id, metadata: { reason: reason ?? null, bulk: items.length > 1 }, ipAddress: req.ip, userAgent: req.get('user-agent') });
        void notifyCompany(item.id, {
          kind: approve ? 'COMPANY_VERIFIED' : 'COMPANY_VERIFICATION_REVOKED', type: approve ? 'success' : 'warning',
          title: approve ? 'Your business is verified' : 'Verification not approved',
          message: approve ? 'Your business now shows the verified badge.' : `We could not verify your business yet.${why}`, link: '/app/verification',
        });
        emitToCompany(item.id, 'company:updated', { id: item.id, verified: approve });
      }
      results.push({ ...item, ok: true });
    } catch (error) {
      logger.error('Review queue decide error:', error);
      results.push({ ...item, ok: false, error: 'Failed' });
    }
  }
  res.json({ decided: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
});

// --- User Management ---

// Get all users
router.get('/users', ...adminAccess, async (_req: AuthRequest, res: Response) => {
  try {
    const connection = pool;
    const [users] = await connection.query(`SELECT u.id, u.email, u.phone, u.firstName, u.lastName, u.role, u.createdAt, u.emailVerified, u.suspendedAt, u.suspendedReason,
              (SELECT c.id FROM companies c WHERE c.userId = u.id ORDER BY c.createdAt ASC LIMIT 1) AS companyId
       FROM users u`);
    res.json((users as any[]).map(u => ({ ...u, role: normalizeAccountRole(u.role) })));
  } catch (error) {
    logger.error('Admin get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user
router.post('/users', ...adminAccess, validateRequest(adminCreateUserSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const connection = pool;
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    if ((existing as any[]).length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.query(
      'INSERT INTO users (id, email, password, firstName, lastName, phone, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, email, hashedPassword, firstName, lastName, phone, toDbRole(role)]
    );
    res.status(201).json({ id, email, firstName, lastName, role: normalizeAccountRole(toDbRole(role)) });
  } catch (error) {
    logger.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', ...adminAccess, validateRequest(adminUpdateUserSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, firstName, lastName, phone, role, password } = req.body;
    const nextRole = role ? toDbRole(role) : null;
    if (nextRole && nextRole !== 'admin') {
      const guard = await adminRemovalGuard(req, req.params.id, 'change the role of');
      if (guard) return res.status(guard.status).json({ error: guard.error });
    }
    const connection = pool;
    
    let query = 'UPDATE users SET email = COALESCE(?, email), firstName = COALESCE(?, firstName), lastName = COALESCE(?, lastName), phone = COALESCE(?, phone), role = COALESCE(?, role)';
    const params = [email, firstName, lastName, phone, role ? toDbRole(role) : null];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await connection.query(query, params);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    logger.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', ...adminAccess, async (req: AuthRequest, res: Response) => {
  try {
    const guard = await adminRemovalGuard(req, req.params.id, 'delete');
    if (guard) return res.status(guard.status).json({ error: guard.error });
    const connection = pool;
    await connection.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * Protects the platform from locking itself out. An admin cannot demote, suspend or delete themselves, and the last
 * active admin can never be removed. Returns an error to send, or null when the action is fine.
 */
async function adminRemovalGuard(req: AuthRequest, targetId: string, verb: string): Promise<{ status: number; error: string } | null> {
  if (targetId === req.userId) return { status: 400, error: `You cannot ${verb} your own account.` };
  const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [targetId]);
  const target = (rows as { role: string }[])[0];
  if (!target) return { status: 404, error: 'User not found' };
  if (target.role === 'admin') {
    const [others] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND suspendedAt IS NULL AND id <> ?", [targetId]);
    if (Number((others as { n: number }[])[0]?.n) === 0) return { status: 409, error: 'There must always be at least one active admin.' };
  }
  return null;
}

// --- Dashboard numbers --------------------------------------------------------------------------------------------------

router.get('/stats', ...adminAccess, async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 90);
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    const [users, companies, requirements, proposals, deals, kyc, signups] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total, SUM(createdAt >= ?) AS recent, SUM(emailVerified) AS emailVerified, SUM(suspendedAt IS NOT NULL) AS suspended FROM users', [since]),
      pool.query('SELECT COUNT(*) AS total, SUM(verified) AS verified, SUM(createdAt >= ?) AS recent FROM companies WHERE deletedAt IS NULL', [since]),
      pool.query('SELECT status, COUNT(*) AS n FROM requirements WHERE deletedAt IS NULL GROUP BY status'),
      pool.query('SELECT status, COUNT(*) AS n FROM proposals WHERE createdAt >= ? GROUP BY status', [since]),
      pool.query('SELECT status, COUNT(*) AS n, COALESCE(SUM(totalAmount), 0) AS amount FROM deals WHERE deletedAt IS NULL GROUP BY status'),
      pool.query("SELECT COUNT(*) AS n FROM kyc_documents WHERE status = 'PENDING'"),
      pool.query('SELECT DATE_FORMAT(createdAt, "%Y-%m-%d") AS day, COUNT(*) AS n FROM users WHERE createdAt >= ? GROUP BY day ORDER BY day', [since]),
    ]);
    const one = (r: unknown) => ((r as [Record<string, any>[]])[0][0] ?? {}) as Record<string, any>;
    const many = (r: unknown) => (r as [Record<string, any>[]])[0];
    const byStatus = (rows: Record<string, any>[]) => Object.fromEntries(rows.map((x) => [x.status, Number(x.n)]));

    const u = one(users); const c = one(companies);
    const dealRows = many(deals);
    res.json({
      days,
      users: { total: Number(u.total) || 0, recent: Number(u.recent) || 0, emailVerified: Number(u.emailVerified) || 0, suspended: Number(u.suspended) || 0 },
      companies: { total: Number(c.total) || 0, verified: Number(c.verified) || 0, unverified: (Number(c.total) || 0) - (Number(c.verified) || 0), recent: Number(c.recent) || 0 },
      requirements: byStatus(many(requirements)),
      proposals: byStatus(many(proposals)),
      deals: { byStatus: byStatus(dealRows), totalValue: dealRows.reduce((sum, x) => sum + Number(x.amount || 0), 0) },
      pendingReview: { documents: Number(one(kyc).n) || 0, companies: (Number(c.total) || 0) - (Number(c.verified) || 0) },
      signupsByDay: many(signups).map((x) => ({ day: x.day, count: Number(x.n) })),
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to load the dashboard numbers' });
  }
});

// --- Audit log: search, filter, page and export --------------------------------------------------------------------------

router.get('/audit/actions', ...adminAccess, async (_req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action LIMIT 300');
    res.json((rows as { action: string }[]).map((r) => r.action));
  } catch (error) {
    logger.error('Audit actions error:', error);
    res.status(500).json({ error: 'Failed to load actions' });
  }
});

router.get('/audit', ...adminAccess, async (req: AuthRequest, res: Response) => {
  try {
    const csv = req.query.format === 'csv';
    const limit = csv ? 5000 : Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = csv ? 0 : Math.max(Number(req.query.offset) || 0, 0);
    const like = (v: string) => `%${v.replace(/[\\%_]/g, '\\$&')}%`;
    const where: string[] = ['1=1'];
    const params: unknown[] = [];
    const q = String(req.query.q ?? '').trim().slice(0, 100);
    if (q) {
      where.push('(a.action LIKE ? OR a.resourceType LIKE ? OR a.resourceId LIKE ? OR u.email LIKE ? OR c.name LIKE ? OR CAST(a.metadata AS CHAR) LIKE ?)');
      params.push(like(q), like(q), like(q), like(q), like(q), like(q));
    }
    const action = String(req.query.action ?? '').trim().slice(0, 120);
    if (action) { where.push('a.action = ?'); params.push(action); }
    const userId = String(req.query.userId ?? '').trim().slice(0, 36);
    if (userId) { where.push('a.userId = ?'); params.push(userId); }
    const from = String(req.query.from ?? '');
    const to = String(req.query.to ?? '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) { where.push('a.createdAt >= ?'); params.push(`${from} 00:00:00`); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { where.push('a.createdAt <= ?'); params.push(`${to} 23:59:59`); }
    const whereSql = where.join(' AND ');
    const joins = 'FROM audit_logs a LEFT JOIN users u ON u.id = a.userId LEFT JOIN companies c ON c.id = a.companyId';

    const [rows] = await pool.query(
      `SELECT a.id, a.userId, u.email AS actorEmail, a.companyId, c.name AS companyName, a.action, a.resourceType, a.resourceId,
              a.metadata, a.ipAddress, a.createdAt ${joins} WHERE ${whereSql} ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    if (csv) {
      const header = ['Time', 'Actor', 'Company', 'Action', 'Resource type', 'Resource id', 'IP address', 'Details'];
      const lines = (rows as Record<string, any>[]).map((r) =>
        [new Date(r.createdAt).toISOString(), r.actorEmail, r.companyName, r.action, r.resourceType, r.resourceId, r.ipAddress, r.metadata].map(csvCell).join(',')
      );
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send([header.map(csvCell).join(','), ...lines].join('\r\n'));
    }

    const [count] = await pool.query(`SELECT COUNT(*) AS total ${joins} WHERE ${whereSql}`, params);
    res.json({ total: Number((count as { total: number }[])[0]?.total) || 0, limit, offset, rows });
  } catch (error) {
    logger.error('Admin audit error:', error);
    res.status(500).json({ error: 'Failed to load the audit log' });
  }
});

// --- Suspend / reinstate a user --------------------------------------------------------------------------------------------

router.put('/users/:id/suspend', ...adminAccess, validateRequest(suspendSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { suspended, reason } = req.body as { suspended: boolean; reason?: string };
    if (suspended) {
      const guard = await adminRemovalGuard(req, req.params.id, 'suspend');
      if (guard) return res.status(guard.status).json({ error: guard.error });
    } else {
      const [exists] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
      if ((exists as unknown[]).length === 0) return res.status(404).json({ error: 'User not found' });
    }
    await pool.query('UPDATE users SET suspendedAt = ?, suspendedReason = ? WHERE id = ?', [suspended ? new Date() : null, suspended ? reason ?? null : null, req.params.id]);
    // A suspended person is signed out everywhere straight away.
    if (suspended) await pool.query('UPDATE refresh_tokens SET revokedAt = CURRENT_TIMESTAMP WHERE userId = ? AND revokedAt IS NULL', [req.params.id]);

    await createAuditLog({
      userId: req.userId, action: suspended ? 'USER_SUSPENDED' : 'USER_REINSTATED', resourceType: 'user', resourceId: req.params.id,
      metadata: { reason: reason ?? null }, ipAddress: req.ip, userAgent: req.get('user-agent'),
    });
    emitToUser(req.params.id, 'user:updated', { suspended });
    res.json({ id: req.params.id, suspended });
  } catch (error) {
    logger.error('Admin suspend user error:', error);
    res.status(500).json({ error: 'Failed to update the user' });
  }
});


// --- Deals (admin view, with company names and progress) --------------------------------------------------------------------

router.get('/deals', ...adminAccess, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const like = (v: string) => `%${v.replace(/[\%_]/g, '\$&')}%`;
    const where: string[] = ['d.deletedAt IS NULL'];
    const params: unknown[] = [];
    const status = String(req.query.status ?? '');
    if (['pending', 'approved', 'rejected', 'completed', 'cancelled'].includes(status)) { where.push('d.status = ?'); params.push(status); }
    const q = String(req.query.q ?? '').trim().slice(0, 100);
    if (q) { where.push('(d.title LIKE ? OR bc.name LIKE ? OR sc.name LIKE ?)'); params.push(like(q), like(q), like(q)); }
    const whereSql = where.join(' AND ');
    const from = 'FROM deals d JOIN companies bc ON bc.id = d.buyerId JOIN companies sc ON sc.id = d.sellerId';

    const [rows] = await pool.query(
      `SELECT d.id, d.title, d.status, d.totalAmount, d.createdAt, d.buyerId, d.sellerId, bc.name AS buyerName, sc.name AS sellerName,
              (SELECT COUNT(*) FROM milestones m WHERE m.dealId = d.id AND m.deletedAt IS NULL) AS milestones,
              (SELECT COUNT(*) FROM milestones m WHERE m.dealId = d.id AND m.deletedAt IS NULL AND m.status = 'APPROVED') AS milestonesDone,
              (SELECT doc.status FROM documents doc WHERE doc.dealId = d.id AND doc.docType = 'AGREEMENT' AND doc.deletedAt IS NULL LIMIT 1) AS agreementStatus
       ${from} WHERE ${whereSql} ORDER BY (d.status = 'pending') DESC, d.createdAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [count] = await pool.query(`SELECT COUNT(*) AS total ${from} WHERE ${whereSql}`, params);
    res.json({ total: Number((count as { total: number }[])[0]?.total) || 0, limit, offset, rows });
  } catch (error) {
    logger.error('Admin deals error:', error);
    res.status(500).json({ error: 'Failed to load deals' });
  }
});

// --- Company Management (Proxying to common logic but with Admin check) ---

// Get all companies (Admin view)
router.get('/companies', ...adminAccess, async (_req: AuthRequest, res: Response) => {
  try {
    const connection = pool;
    const [companies] = await connection.query(
      `SELECT c.*, u.email AS ownerEmail,
              (SELECT COUNT(*) FROM deals d WHERE d.deletedAt IS NULL AND (d.buyerId = c.id OR d.sellerId = c.id)) AS dealCount,
              (SELECT COUNT(*) FROM kyc_documents k WHERE k.companyId = c.id AND k.status = 'PENDING') AS pendingDocuments
       FROM companies c LEFT JOIN users u ON u.id = c.userId
       WHERE c.deletedAt IS NULL ORDER BY c.verified ASC, c.createdAt DESC LIMIT 500`
    );
    res.json((companies as any[]).map((c) => ({ ...c, trust: trustChecks(c) })));
  } catch (error) {
    logger.error('Admin get companies error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// --- Ops / Reliability ---

router.get('/ops/reliability', ...adminAccess, async (req: AuthRequest, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 200);
  let connection;

  try {
    connection = pool;

    const [retryStatsRows] = await connection.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'QUEUED' THEN 1 ELSE 0 END) AS queued,
        SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END) AS processing,
        SUM(CASE WHEN status = 'RETRYING' THEN 1 ELSE 0 END) AS retrying,
        SUM(CASE WHEN status = 'SUCCEEDED' THEN 1 ELSE 0 END) AS succeeded,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN status = 'DEAD_LETTER' THEN 1 ELSE 0 END) AS deadLetter
       FROM payment_retry_jobs`
    );

    const [oldestPendingRows] = await connection.query(
      `SELECT id, paymentIntentId, status, attempts, maxAttempts, lastError, nextRunAt, createdAt, updatedAt
       FROM payment_retry_jobs
       WHERE status IN ('QUEUED', 'PROCESSING', 'RETRYING')
       ORDER BY COALESCE(nextRunAt, createdAt) ASC
       LIMIT 1`
    );

    const [pendingRows] = await connection.query(
      `SELECT id, paymentIntentId, status, attempts, maxAttempts, lastError, nextRunAt, createdAt, updatedAt
       FROM payment_retry_jobs
       WHERE status IN ('QUEUED', 'PROCESSING', 'RETRYING')
       ORDER BY COALESCE(nextRunAt, createdAt) ASC
       LIMIT ?`,
      [limit]
    );

    const [retryDeadLettersRows] = await connection.query(
      `SELECT id, paymentIntentId, status, attempts, maxAttempts, lastError, createdAt, updatedAt
       FROM payment_retry_jobs
       WHERE status = 'DEAD_LETTER'
       ORDER BY updatedAt DESC, createdAt DESC
       LIMIT ?`,
      [limit]
    );

    const [jobDeadLettersRows] = await connection.query(
      `SELECT id, type, attempts, lastError, dlqReason, queueBackend, createdAt, updatedAt
       FROM jobs
       WHERE status = 'dead_letter'
       ORDER BY updatedAt DESC, createdAt DESC
       LIMIT ?`,
      [limit]
    );

    const [retryDeadLetterCountRows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM payment_retry_jobs
       WHERE status = 'DEAD_LETTER'`
    );
    const [jobDeadLetterCountRows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM jobs
       WHERE status = 'dead_letter'`
    );

    let bullmq: Record<string, unknown> = {
      enabled: false,
      paymentRetry: null,
      dlq: null,
    };

    if (isBullMqEnabled()) {
      const paymentRetryQueue = getQueue(PAYMENT_RETRY_QUEUE);
      const dlqQueue = getQueue(DLQ_QUEUE);

      const paymentRetryCounts = await paymentRetryQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed'
      );
      const dlqCounts = await dlqQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');

      bullmq = {
        enabled: true,
        paymentRetry: paymentRetryCounts,
        dlq: dlqCounts,
      };
    }

    const retryStats = (retryStatsRows as any[])[0] || {};
    const retryDeadLetters = (retryDeadLettersRows as any[]).map((row) => ({
      source: 'payment_retry_jobs',
      ...row,
    }));
    const jobDeadLetters = (jobDeadLettersRows as any[]).map((row) => ({
      source: 'jobs',
      ...row,
    }));
    const deadLettersCombined = [...retryDeadLetters, ...jobDeadLetters]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, limit);

    res.json({
      generatedAt: new Date().toISOString(),
      window: {
        deadLetterLimit: limit,
      },
      retryQueue: {
        total: Number(retryStats.total || 0),
        queued: Number(retryStats.queued || 0),
        processing: Number(retryStats.processing || 0),
        retrying: Number(retryStats.retrying || 0),
        succeeded: Number(retryStats.succeeded || 0),
        failed: Number(retryStats.failed || 0),
        deadLetter: Number(retryStats.deadLetter || 0),
        oldestPending: (oldestPendingRows as any[])[0] || null,
        pending: pendingRows || [],
      },
      deadLetters: {
        total:
          Number((retryDeadLetterCountRows as any[])[0]?.count || 0) +
          Number((jobDeadLetterCountRows as any[])[0]?.count || 0),
        bySource: {
          paymentRetryJobs: Number((retryDeadLetterCountRows as any[])[0]?.count || 0),
          jobs: Number((jobDeadLetterCountRows as any[])[0]?.count || 0),
        },
        paymentRetryJobs: retryDeadLetters,
        jobs: jobDeadLetters,
        latest: deadLettersCombined,
      },
      bullmq,
    });
  } catch (error) {
    logger.error('Admin reliability dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch reliability dashboard' });
  } finally {
  }
});

export default router;
