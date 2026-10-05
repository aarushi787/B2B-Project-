// Deal milestones: plan the work in steps, the provider marks a step done, the client confirms it. When the client's
// money for that step is held in escrow, the client's confirmation releases it to the provider.
import { Router, Response, Request, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { PoolConnection } from 'mysql2/promise';
import pool, { withTransaction } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requireCompanyRole } from '../middleware/rbac.js';
import { validateRequest } from '../middleware/validation.js';
import { ApiError, errorResponse } from '../utils/http.js';
import { createAuditLog } from '../utils/audit.js';
import { logger } from '../utils/logger.js';
import { notifyCompany } from '../services/notify.js';
import { emitToCompany } from '../realtime/socket.js';
import { allowedActions, applyAction, isOverdue, withinDealTotal, type DealSide, type MilestoneAction, type MilestoneStatus } from '../services/milestones.js';
import { assessRisk } from '../services/risk.js';
import { gstStatus } from '../services/compliance.js';
import { captureHeldPayment, paymentsEnabled } from '../services/stripeClient.js';

const router = Router();
const WRITE_ROLES = ['OWNER', 'ADMIN', 'OPS', 'FINANCE'] as const;
const writeAccess = [authMiddleware, requireCompanyRole([...WRITE_ROLES])] as const;

const milestoneSchema = z.object({
  title: z.string().trim().min(2, 'Give the milestone a title').max(255),
  description: z.string().trim().max(2000).optional(),
  amount: z.number().min(0).max(1_000_000_000),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD').nullable().optional(),
});
const milestoneUpdateSchema = milestoneSchema.partial();
const changesSchema = z.object({ note: z.string().trim().min(3, 'Tell the provider what to change').max(500) });
const emptySchema = z.object({}).passthrough();

type Row = Record<string, any>;

const handle = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => (req: Request, res: Response, _next: NextFunction) => {
  fn(req as AuthRequest, res).catch((err) => {
    if (err instanceof ApiError) return errorResponse(res, err.status, err.code, err.message);
    logger.error('Milestone route error:', err);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  });
};

const MILESTONE_COLUMNS = `m.id, m.dealId, m.title, m.description, m.amount, m.currency, DATE_FORMAT(m.dueDate, '%Y-%m-%d') AS dueDate,
  m.position, m.status, m.submittedAt, m.approvedAt, m.changeNote, m.escrowStatus, m.paymentIntentId, m.createdAt`;

async function loadDeal(conn: Pick<PoolConnection, 'query'>, dealId: string): Promise<Row> {
  const [rows] = await conn.query(
    'SELECT id, title, totalAmount, buyerId, sellerId, status FROM deals WHERE id = ? AND deletedAt IS NULL',
    [dealId]
  );
  const deal = (rows as Row[])[0];
  if (!deal) throw new ApiError(404, 'NOT_FOUND', 'Deal not found');
  return deal;
}

function sideOf(deal: Row, companyId?: string | null): DealSide | null {
  if (!companyId) return null;
  return deal.buyerId === companyId ? 'buyer' : deal.sellerId === companyId ? 'seller' : null;
}

/** The viewer must be a party to the deal (or a platform admin, who may look but not act). */
function viewerSide(deal: Row, req: AuthRequest): DealSide | null {
  const side = sideOf(deal, req.companyId);
  if (!side && req.role !== 'admin') throw new ApiError(404, 'NOT_FOUND', 'Deal not found');
  return side;
}

function present(m: Row, side: DealSide | null) {
  const amount = Number(m.amount);
  const base = {
    id: m.id, dealId: m.dealId, title: m.title, description: m.description ?? '', amount, currency: m.currency,
    dueDate: m.dueDate ?? null, status: m.status as MilestoneStatus, submittedAt: m.submittedAt ?? null, approvedAt: m.approvedAt ?? null,
    changeNote: m.changeNote ?? null, escrowStatus: m.escrowStatus as 'NOT_FUNDED' | 'FUNDED' | 'RELEASED',
  };
  return { ...base, overdue: isOverdue(base), can: allowedActions(base, side) };
}

async function listMilestones(conn: Pick<PoolConnection, 'query'>, dealId: string): Promise<Row[]> {
  const [rows] = await conn.query(
    `SELECT ${MILESTONE_COLUMNS} FROM milestones m WHERE m.dealId = ? AND m.deletedAt IS NULL ORDER BY m.position ASC, m.createdAt ASC`,
    [dealId]
  );
  return rows as Row[];
}

function summarize(rows: Row[], dealTotal: number) {
  const amounts = rows.map((m) => Number(m.amount));
  const planned = amounts.reduce((a, b) => a + b, 0);
  const sum = (pred: (m: Row) => boolean) => rows.filter(pred).reduce((a, m) => a + Number(m.amount), 0);
  return {
    count: rows.length,
    approved: rows.filter((m) => m.status === 'APPROVED').length,
    plannedAmount: planned,
    dealTotal,
    heldInEscrow: sum((m) => m.escrowStatus === 'FUNDED'),
    released: sum((m) => m.escrowStatus === 'RELEASED'),
  };
}

function announce(deal: Row, actorCompanyId: string, event: { kind: string; title: string; message: string; type?: 'info' | 'success' | 'warning' }) {
  const other = actorCompanyId === deal.buyerId ? deal.sellerId : deal.buyerId;
  void notifyCompany(other, { ...event, link: `/app/deals/${deal.id}` });
  emitToCompany(other, 'milestones:updated', { dealId: deal.id });
  emitToCompany(actorCompanyId, 'milestones:updated', { dealId: deal.id });
}

// ---- Company-wide alerts (declared before /:id routes) -------------------------------------------------------------
router.get('/alerts', authMiddleware, handle(async (req, res) => {
  const me = req.companyId;
  if (!me) return res.json([]);
  const alerts: { id: string; kind: string; severity: 'action' | 'warning' | 'info'; title: string; message: string; dealId: string; link: string }[] = [];

  const [rows] = await pool.query(
    `SELECT ${MILESTONE_COLUMNS}, d.title AS dealTitle, d.buyerId, d.sellerId
     FROM milestones m JOIN deals d ON d.id = m.dealId AND d.deletedAt IS NULL
     WHERE m.deletedAt IS NULL AND m.status <> 'APPROVED' AND (d.buyerId = ? OR d.sellerId = ?)`,
    [me, me]
  );
  for (const m of rows as Row[]) {
    const side = sideOf(m, me)!;
    const link = `/app/deals/${m.dealId}`;
    if (m.status === 'SUBMITTED' && side === 'buyer') {
      alerts.push({ id: `submitted-${m.id}`, kind: 'MILESTONE_AWAITING_APPROVAL', severity: 'action', title: 'Milestone waiting for your confirmation', message: `"${m.title}" in ${m.dealTitle} was marked done.`, dealId: m.dealId, link });
    }
    if (m.status === 'PLANNED' && m.changeNote && side === 'seller') {
      alerts.push({ id: `changes-${m.id}`, kind: 'MILESTONE_CHANGES_REQUESTED', severity: 'action', title: 'Changes requested', message: `"${m.title}" in ${m.dealTitle}: ${m.changeNote}`, dealId: m.dealId, link });
    }
    if (isOverdue({ status: m.status, dueDate: m.dueDate })) {
      alerts.push({ id: `overdue-${m.id}`, kind: 'MILESTONE_OVERDUE', severity: 'warning', title: 'Milestone overdue', message: `"${m.title}" in ${m.dealTitle} was due ${m.dueDate}.`, dealId: m.dealId, link });
    }
  }

  const [agreements] = await pool.query(
    `SELECT doc.id, doc.dealId, d.title AS dealTitle
     FROM documents doc JOIN deals d ON d.id = doc.dealId AND d.deletedAt IS NULL
     WHERE doc.docType = 'AGREEMENT' AND doc.deletedAt IS NULL AND doc.status <> 'SIGNED' AND (d.buyerId = ? OR d.sellerId = ?)
       AND NOT EXISTS (SELECT 1 FROM document_signatures s WHERE s.documentId = doc.id AND s.companyId = ?)`,
    [me, me, me]
  );
  for (const a of agreements as Row[]) {
    alerts.push({ id: `sign-${a.id}`, kind: 'AGREEMENT_AWAITING_SIGNATURE', severity: 'action', title: 'Agreement waiting for your signature', message: `Review and sign the agreement for ${a.dealTitle}.`, dealId: a.dealId, link: `/app/deals/${a.dealId}` });
  }

  const order = { action: 0, warning: 1, info: 2 } as const;
  res.json(alerts.sort((a, b) => order[a.severity] - order[b.severity]));
}));

// ---- Per deal -------------------------------------------------------------------------------------------------------
router.get('/deal/:dealId', authMiddleware, handle(async (req, res) => {
  const deal = await loadDeal(pool, req.params.dealId);
  const side = viewerSide(deal, req);
  const rows = await listMilestones(pool, deal.id);
  res.json({ side, milestones: rows.map((m) => present(m, side)), summary: summarize(rows, Number(deal.totalAmount) || 0) });
}));

router.get('/deal/:dealId/risk', authMiddleware, handle(async (req, res) => {
  const deal = await loadDeal(pool, req.params.dealId);
  viewerSide(deal, req);

  const [parties] = await pool.query(
    `SELECT c.id, c.name, c.verified, c.gst,
            (SELECT COUNT(*) FROM deals x WHERE x.status = 'completed' AND x.deletedAt IS NULL AND (x.buyerId = c.id OR x.sellerId = c.id)) AS completedDeals
     FROM companies c WHERE c.id IN (?, ?)`,
    [deal.buyerId, deal.sellerId]
  );
  const party = (id: string) => {
    const c = (parties as Row[]).find((p) => p.id === id) ?? {};
    return { name: c.name ?? 'Unknown company', verified: Boolean(c.verified), gst: gstStatus(c.gst), completedDeals: Number(c.completedDeals) || 0 };
  };
  const [agreementRows] = await pool.query("SELECT status FROM documents WHERE dealId = ? AND docType = 'AGREEMENT' AND deletedAt IS NULL LIMIT 1", [deal.id]);
  const agreement = (agreementRows as Row[])[0];
  const milestones = await listMilestones(pool, deal.id);

  res.json(assessRisk({
    buyer: party(deal.buyerId),
    seller: party(deal.sellerId),
    agreement: !agreement ? 'none' : agreement.status === 'SIGNED' ? 'signed' : 'awaiting',
    milestones: milestones.map((m) => ({ status: m.status, dueDate: m.dueDate, amount: Number(m.amount), escrowStatus: m.escrowStatus })),
    escrowAvailable: paymentsEnabled(),
  }));
}));

router.post('/deal/:dealId', ...writeAccess, validateRequest(milestoneSchema), handle(async (req, res) => {
  const deal = await loadDeal(pool, req.params.dealId);
  const side = sideOf(deal, req.companyId);
  if (!side) throw new ApiError(403, 'FORBIDDEN', 'Only the buyer or seller of this deal can add milestones');
  const { title, description, amount, dueDate } = req.body as z.infer<typeof milestoneSchema>;

  const id = uuidv4();
  await withTransaction(async (conn) => {
    await conn.query('SELECT id FROM deals WHERE id = ? FOR UPDATE', [deal.id]); // serialise concurrent additions
    const existing = await listMilestones(conn, deal.id);
    if (!withinDealTotal(existing.map((m) => Number(m.amount)), amount, Number(deal.totalAmount) || 0)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'The milestone amounts would add up to more than the deal total');
    }
    await conn.query(
      `INSERT INTO milestones (id, dealId, title, description, amount, dueDate, position, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, deal.id, title, description ?? null, amount, dueDate ?? null, existing.length, req.userId ?? null]
    );
  });
  await createAuditLog({ userId: req.userId, companyId: req.companyId, action: 'MILESTONE_CREATED', resourceType: 'milestone', resourceId: id, metadata: { dealId: deal.id, amount }, ipAddress: req.ip, userAgent: req.get('user-agent') });
  announce(deal, req.companyId!, { kind: 'MILESTONE_ADDED', title: 'Milestone added', message: `"${title}" was added to ${deal.title}.`, type: 'info' });

  const [created] = await pool.query(`SELECT ${MILESTONE_COLUMNS} FROM milestones m WHERE m.id = ?`, [id]);
  res.status(201).json(present((created as Row[])[0], side));
}));

/** Loads a milestone with its deal and the caller's side, or throws 404 when the caller is not a party. */
async function loadForCaller(conn: Pick<PoolConnection, 'query'>, id: string, req: AuthRequest, lock = false) {
  const [rows] = await conn.query(
    `SELECT ${MILESTONE_COLUMNS}, d.title AS dealTitle, d.totalAmount, d.buyerId, d.sellerId
     FROM milestones m JOIN deals d ON d.id = m.dealId AND d.deletedAt IS NULL
     WHERE m.id = ? AND m.deletedAt IS NULL ${lock ? 'FOR UPDATE' : ''}`,
    [id]
  );
  const m = (rows as Row[])[0];
  if (!m) throw new ApiError(404, 'NOT_FOUND', 'Milestone not found');
  const side = sideOf(m, req.companyId);
  if (!side) throw new ApiError(404, 'NOT_FOUND', 'Milestone not found');
  return { m, side, deal: { id: m.dealId, title: m.dealTitle, buyerId: m.buyerId, sellerId: m.sellerId, totalAmount: m.totalAmount } as Row };
}

router.put('/:id', ...writeAccess, validateRequest(milestoneUpdateSchema), handle(async (req, res) => {
  const { m, side, deal } = await loadForCaller(pool, req.params.id, req);
  if (!allowedActions({ status: m.status, escrowStatus: m.escrowStatus, amount: Number(m.amount) }, side).edit) {
    throw new ApiError(409, 'CONFLICT', 'A milestone can only be edited while it is planned and has no escrow funds');
  }
  const b = req.body as Partial<z.infer<typeof milestoneSchema>>;
  if (b.amount !== undefined) {
    const others = (await listMilestones(pool, deal.id)).filter((x) => x.id !== m.id).map((x) => Number(x.amount));
    if (!withinDealTotal(others, b.amount, Number(deal.totalAmount) || 0)) throw new ApiError(400, 'VALIDATION_ERROR', 'The milestone amounts would add up to more than the deal total');
  }
  await pool.query(
    'UPDATE milestones SET title = COALESCE(?, title), description = COALESCE(?, description), amount = COALESCE(?, amount), dueDate = ? WHERE id = ?',
    [b.title ?? null, b.description ?? null, b.amount ?? null, b.dueDate === undefined ? m.dueDate : b.dueDate, m.id]
  );
  emitToCompany(deal.buyerId, 'milestones:updated', { dealId: deal.id });
  emitToCompany(deal.sellerId, 'milestones:updated', { dealId: deal.id });
  const [rows] = await pool.query(`SELECT ${MILESTONE_COLUMNS} FROM milestones m WHERE m.id = ?`, [m.id]);
  res.json(present((rows as Row[])[0], side));
}));

router.delete('/:id', ...writeAccess, handle(async (req, res) => {
  const { m, side, deal } = await loadForCaller(pool, req.params.id, req);
  if (!allowedActions({ status: m.status, escrowStatus: m.escrowStatus, amount: Number(m.amount) }, side).delete) {
    throw new ApiError(409, 'CONFLICT', 'A milestone can only be removed while it is planned and has no escrow funds');
  }
  await pool.query('UPDATE milestones SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [m.id]);
  await createAuditLog({ userId: req.userId, companyId: req.companyId, action: 'MILESTONE_DELETED', resourceType: 'milestone', resourceId: m.id, metadata: { dealId: deal.id }, ipAddress: req.ip, userAgent: req.get('user-agent') });
  emitToCompany(deal.buyerId, 'milestones:updated', { dealId: deal.id });
  emitToCompany(deal.sellerId, 'milestones:updated', { dealId: deal.id });
  res.json({ id: m.id, deleted: true });
}));

/** Runs one status change under a row lock so two people clicking at once cannot both win. */
async function transition(req: AuthRequest, res: Response, action: MilestoneAction, note?: string) {
  let released = false;
  const out = await withTransaction(async (conn) => {
    const { m, side, deal } = await loadForCaller(conn, req.params.id, req, true);
    const result = applyAction(m.status, action, side);
    if (!result.ok) throw new ApiError(result.status, result.status === 403 ? 'FORBIDDEN' : 'CONFLICT', result.error);

    if (action === 'submit') {
      await conn.query("UPDATE milestones SET status = 'SUBMITTED', submittedAt = CURRENT_TIMESTAMP, submittedBy = ?, changeNote = NULL WHERE id = ?", [req.userId ?? null, m.id]);
    } else if (action === 'requestChanges') {
      await conn.query("UPDATE milestones SET status = 'PLANNED', changeNote = ?, submittedAt = NULL WHERE id = ?", [note ?? null, m.id]);
    } else {
      if (m.escrowStatus === 'FUNDED') {
        // Release the held money to the provider. If the payment provider refuses, nothing here is committed.
        await captureHeldPayment(m.paymentIntentId);
        released = true;
      }
      await conn.query(
        "UPDATE milestones SET status = 'APPROVED', approvedAt = CURRENT_TIMESTAMP, approvedBy = ?, changeNote = NULL, escrowStatus = IF(escrowStatus = 'FUNDED', 'RELEASED', escrowStatus) WHERE id = ?",
        [req.userId ?? null, m.id]
      );
      if (released) {
        const description = `Milestone payment: ${m.title}`;
        await conn.query('INSERT INTO ledger (id, companyId, dealId, type, amount, description) VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)', [
          uuidv4(), deal.buyerId, deal.id, 'debit', m.amount, description,
          uuidv4(), deal.sellerId, deal.id, 'credit', m.amount, description,
        ]);
      }
    }
    const [rows] = await conn.query(`SELECT ${MILESTONE_COLUMNS} FROM milestones m WHERE m.id = ?`, [m.id]);
    return { milestone: (rows as Row[])[0], side, deal, title: m.title };
  });

  await createAuditLog({
    userId: req.userId, companyId: req.companyId, action: `MILESTONE_${action.toUpperCase()}`, resourceType: 'milestone', resourceId: out.milestone.id,
    metadata: { dealId: out.deal.id, released }, ipAddress: req.ip, userAgent: req.get('user-agent'),
  });
  const text = {
    submit: { kind: 'MILESTONE_SUBMITTED', title: 'Milestone marked done', message: `"${out.title}" in ${out.deal.title} is ready for your confirmation.`, type: 'info' as const },
    approve: { kind: 'MILESTONE_APPROVED', title: released ? 'Milestone confirmed and payment released' : 'Milestone confirmed', message: `"${out.title}" in ${out.deal.title} was confirmed${released ? ' and its escrow payment was released' : ''}.`, type: 'success' as const },
    requestChanges: { kind: 'MILESTONE_CHANGES_REQUESTED', title: 'Changes requested', message: `"${out.title}" in ${out.deal.title}: ${note}`, type: 'warning' as const },
  }[action];
  announce(out.deal, req.companyId!, text);
  return res.json(present(out.milestone, out.side));
}

router.post('/:id/submit', ...writeAccess, validateRequest(emptySchema), handle((req, res) => transition(req, res, 'submit')));
router.post('/:id/approve', ...writeAccess, validateRequest(emptySchema), handle((req, res) => transition(req, res, 'approve')));
router.post('/:id/request-changes', ...writeAccess, validateRequest(changesSchema), handle((req, res) => transition(req, res, 'requestChanges', req.body.note)));

export default router;
