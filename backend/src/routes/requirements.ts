// Requirements (RFQs) and proposals with turn-based negotiation. Accepting a proposal creates the deal.
// Business rules live in services/negotiation.ts (pure, unit-tested); this file is HTTP + SQL.
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { PoolConnection } from 'mysql2/promise';
import pool, { withTransaction } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requireCompanyRole } from '../middleware/rbac.js';
import { withIdempotency } from '../middleware/idempotency.js';
import {
  offerSchema,
  proposalCreateSchema,
  requirementCreateSchema,
  requirementUpdateSchema,
  emptyBodySchema,
  validateRequest,
} from '../middleware/validation.js';
import {
  NegotiationError,
  ProposalAction,
  ProposalStatus,
  RequirementStatus,
  Side,
  allowedActions,
  assertAllowed,
  dealFromAcceptedProposal,
  parseDeliverables,
  sideOf,
  validateBudget,
  validateOffer,
} from '../services/negotiation.js';
import { emitToCompany } from '../realtime/socket.js';
import { notifyAdmins, notifyCompany } from '../services/notify.js';
import { errorResponse } from '../utils/http.js';
import { logger } from '../utils/logger.js';

type Row = Record<string, any>;

const WRITE_ROLES = ['OWNER', 'ADMIN', 'OPS'] as const;
const writeAccess = [authMiddleware, requireCompanyRole([...WRITE_ROLES])] as const;

const asNumber = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

function likeEscape(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function paging(req: AuthRequest) {
  const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

/** Wraps a handler: maps rule violations to HTTP errors and everything else to a logged 500. */
function handle(fn: (req: AuthRequest, res: Response) => Promise<unknown>) {
  return async (req: AuthRequest, res: Response) => {
    try {
      await fn(req, res);
    } catch (error: any) {
      if (error instanceof NegotiationError) {
        const code = error.status === 403 ? 'FORBIDDEN' : error.status === 404 ? 'NOT_FOUND' : error.status === 409 ? 'CONFLICT' : 'BAD_REQUEST';
        return errorResponse(res, error.status, code, error.message);
      }
      if (error?.code === 'ER_DUP_ENTRY') {
        return errorResponse(res, 409, 'CONFLICT', 'Your company has already sent a proposal for this requirement');
      }
      logger.error('requirements route error:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
    }
  };
}

function needCompany(req: AuthRequest): string {
  if (!req.companyId) throw new NegotiationError(403, 'Your account must belong to a company to do this');
  return req.companyId;
}

// ---------- mapping ----------

function mapRequirement(r: Row, viewerCompanyId?: string | null) {
  return {
    id: r.id,
    companyId: r.companyId,
    companyName: r.companyName ?? null,
    companyVerified: r.companyVerified === undefined ? undefined : Boolean(r.companyVerified),
    title: r.title,
    description: r.description ?? '',
    category: r.category ?? null,
    budgetMin: asNumber(r.budgetMin),
    budgetMax: asNumber(r.budgetMax),
    currency: r.currency ?? 'INR',
    timeline: r.timeline ?? null,
    status: r.status as RequirementStatus,
    dealId: r.dealId ?? null,
    proposalCount: r.proposalCount === undefined ? undefined : Number(r.proposalCount),
    myProposalId: r.myProposalId ?? null,
    isMine: !!viewerCompanyId && r.companyId === viewerCompanyId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function mapProposal(r: Row, viewerCompanyId?: string | null) {
  const side = sideOf(viewerCompanyId, r.requirementCompanyId, r.companyId);
  return {
    id: r.id,
    requirementId: r.requirementId,
    requirementTitle: r.requirementTitle,
    requirementStatus: r.requirementStatus as RequirementStatus,
    requirementBudgetMin: asNumber(r.requirementBudgetMin),
    requirementBudgetMax: asNumber(r.requirementBudgetMax),
    proposerId: r.companyId,
    proposerName: r.proposerName ?? null,
    proposerVerified: Boolean(r.proposerVerified),
    requesterId: r.requirementCompanyId,
    requesterName: r.requesterName ?? null,
    amount: Number(r.amount),
    currency: r.currency ?? 'INR',
    timeline: r.timeline ?? null,
    message: r.message ?? '',
    deliverables: parseDeliverables(r.deliverables),
    status: r.status as ProposalStatus,
    lastOfferBy: r.lastOfferBy as Side,
    version: Number(r.version),
    side,
    allowedActions: allowedActions({
      requirementStatus: r.requirementStatus,
      proposalStatus: r.status,
      lastOfferBy: r.lastOfferBy,
      side,
    }),
    dealId: r.dealId ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

const PROPOSAL_SELECT = `
  SELECT p.*, r.title AS requirementTitle, r.status AS requirementStatus, r.companyId AS requirementCompanyId,
         r.budgetMin AS requirementBudgetMin, r.budgetMax AS requirementBudgetMax, r.dealId AS dealId,
         pc.name AS proposerName, pc.verified AS proposerVerified, rc.name AS requesterName
  FROM proposals p
  JOIN requirements r ON r.id = p.requirementId AND r.deletedAt IS NULL
  JOIN companies pc ON pc.id = p.companyId
  JOIN companies rc ON rc.id = r.companyId`;

async function insertRevision(
  conn: PoolConnection,
  proposalId: string,
  version: number,
  side: Side,
  companyId: string,
  userId: string,
  terms: { amount: number; timeline?: string | null; message?: string | null; deliverables?: string[] }
) {
  await conn.query(
    `INSERT INTO proposal_revisions (id, proposalId, version, offeredBy, authorCompanyId, authorUserId, amount, timeline, message, deliverables)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [uuidv4(), proposalId, version, side, companyId, userId, terms.amount, terms.timeline ?? null, terms.message ?? null, JSON.stringify(terms.deliverables ?? [])]
  );
}

/** Lock order is always requirement, then proposal, so concurrent actions cannot deadlock. */
async function loadForUpdate(conn: PoolConnection, proposalId: string) {
  const [pre] = await conn.query('SELECT requirementId FROM proposals WHERE id = ?', [proposalId]);
  const requirementId = (pre as Row[])[0]?.requirementId;
  if (!requirementId) throw new NegotiationError(404, 'Proposal not found');
  const [reqRows] = await conn.query('SELECT * FROM requirements WHERE id = ? AND deletedAt IS NULL FOR UPDATE', [requirementId]);
  const [propRows] = await conn.query('SELECT * FROM proposals WHERE id = ? FOR UPDATE', [proposalId]);
  const requirement = (reqRows as Row[])[0];
  const proposal = (propRows as Row[])[0];
  if (!requirement || !proposal) throw new NegotiationError(404, 'Proposal not found');
  return { requirement, proposal };
}

function notifyBoth(requirement: Row, proposal: Row, event: string, payload: Record<string, unknown> = {}) {
  const body = { proposalId: proposal.id, requirementId: requirement.id, ...payload };
  emitToCompany(requirement.companyId, event, body);
  emitToCompany(proposal.companyId, event, body);
}

// =====================================================================================
// /api/requirements
// =====================================================================================
export const requirementsRouter = Router();

// Create
requirementsRouter.post('/', ...writeAccess, validateRequest(requirementCreateSchema), handle(async (req, res) => {
  const companyId = needCompany(req);
  const b = req.body;
  const budgetError = validateBudget(b.budgetMin, b.budgetMax);
  if (budgetError) throw new NegotiationError(400, budgetError);

  const id = uuidv4();
  await pool.query(
    `INSERT INTO requirements (id, companyId, createdBy, title, description, category, budgetMin, budgetMax, timeline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, companyId, req.userId, b.title, b.description, b.category ?? null, b.budgetMin ?? null, b.budgetMax ?? null, b.timeline ?? null]
  );
  const [rows] = await pool.query('SELECT * FROM requirements WHERE id = ?', [id]);
  void notifyAdmins({
    kind: 'REQUIREMENT_POSTED', title: 'New requirement posted', message: `"${b.title}" was posted.`,
    actorUserId: req.userId, actorCompanyId: companyId, resourceType: 'requirement', resourceId: id, link: `/app/requirements/${id}`,
  });
  return res.status(201).json(mapRequirement((rows as Row[])[0], companyId));
}));

// List: scope=mine (default) | open (other companies' open requirements to propose on) | all (platform admin)
requirementsRouter.get('/', authMiddleware, handle(async (req, res) => {
  const scope = String(req.query.scope ?? 'mine');
  const isAdmin = req.role === 'admin';
  const { page, limit, offset } = paging(req);

  const where: string[] = ['r.deletedAt IS NULL'];
  const whereParams: unknown[] = [];
  const selectParams: unknown[] = [];
  let myProposalSelect = 'NULL AS myProposalId';

  if (scope === 'all') {
    if (!isAdmin) throw new NegotiationError(403, 'Only platform admins can list all requirements');
  } else if (scope === 'open') {
    const companyId = needCompany(req);
    where.push(`r.status = 'open'`, 'r.companyId <> ?');
    whereParams.push(companyId);
    myProposalSelect = '(SELECT p2.id FROM proposals p2 WHERE p2.requirementId = r.id AND p2.companyId = ? LIMIT 1) AS myProposalId';
    selectParams.push(companyId);
  } else {
    const companyId = needCompany(req);
    where.push('r.companyId = ?');
    whereParams.push(companyId);
  }

  // status accepts one value or a comma-separated list, e.g. status=closed,awarded,cancelled
  const statuses = String(req.query.status ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => ['open', 'closed', 'awarded', 'cancelled'].includes(s));
  if (statuses.length) {
    where.push(`r.status IN (${statuses.map(() => '?').join(', ')})`);
    whereParams.push(...statuses);
  }
  const category = req.query.category ? String(req.query.category) : '';
  if (category) {
    where.push('r.category = ?');
    whereParams.push(category);
  }
  const q = req.query.q ? String(req.query.q).trim().slice(0, 100) : '';
  if (q) {
    where.push(`(r.title LIKE ? OR r.description LIKE ?)`);
    whereParams.push(`%${likeEscape(q)}%`, `%${likeEscape(q)}%`);
  }

  const whereSql = where.join(' AND ');
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM requirements r WHERE ${whereSql}`, whereParams);
  const total = Number((countRows as Row[])[0].total);

  const [rows] = await pool.query(
    `SELECT r.*, c.name AS companyName, c.verified AS companyVerified,
            (SELECT COUNT(*) FROM proposals p WHERE p.requirementId = r.id AND p.status IN ('submitted', 'shortlisted')) AS proposalCount,
            ${myProposalSelect}
     FROM requirements r
     JOIN companies c ON c.id = r.companyId
     WHERE ${whereSql}
     ORDER BY r.createdAt DESC
     LIMIT ? OFFSET ?`,
    [...selectParams, ...whereParams, limit, offset]
  );
  return res.json({
    data: (rows as Row[]).map((r) => mapRequirement(r, req.companyId)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}));

async function loadRequirementVisibleTo(req: AuthRequest, id: string) {
  const [rows] = await pool.query(
    `SELECT r.*, c.name AS companyName, c.verified AS companyVerified,
            (SELECT COUNT(*) FROM proposals p WHERE p.requirementId = r.id AND p.status IN ('submitted', 'shortlisted')) AS proposalCount,
            (SELECT p2.id FROM proposals p2 WHERE p2.requirementId = r.id AND p2.companyId = ? LIMIT 1) AS myProposalId
     FROM requirements r
     JOIN companies c ON c.id = r.companyId
     WHERE r.id = ? AND r.deletedAt IS NULL`,
    [req.companyId ?? '', id]
  );
  const row = (rows as Row[])[0];
  if (!row) throw new NegotiationError(404, 'Requirement not found');
  const mine = !!req.companyId && row.companyId === req.companyId;
  // Open requirements are a public marketplace; closed ones are visible to the owner (and admins) only.
  if (!mine && req.role !== 'admin' && row.status !== 'open') throw new NegotiationError(404, 'Requirement not found');
  return row;
}

// Details
requirementsRouter.get('/:id', authMiddleware, handle(async (req, res) => {
  const row = await loadRequirementVisibleTo(req, req.params.id);
  return res.json(mapRequirement(row, req.companyId));
}));

// Edit (owner, while open)
requirementsRouter.put('/:id', ...writeAccess, validateRequest(requirementUpdateSchema), handle(async (req, res) => {
  const companyId = needCompany(req);
  const [rows] = await pool.query('SELECT * FROM requirements WHERE id = ? AND deletedAt IS NULL', [req.params.id]);
  const current = (rows as Row[])[0];
  if (!current || current.companyId !== companyId) throw new NegotiationError(404, 'Requirement not found');
  if (current.status !== 'open') throw new NegotiationError(409, 'Only open requirements can be edited');

  const b = req.body;
  const next = {
    title: b.title ?? current.title,
    description: b.description ?? current.description,
    category: b.category ?? current.category,
    budgetMin: b.budgetMin ?? asNumber(current.budgetMin),
    budgetMax: b.budgetMax ?? asNumber(current.budgetMax),
    timeline: b.timeline ?? current.timeline,
  };
  const budgetError = validateBudget(next.budgetMin, next.budgetMax);
  if (budgetError) throw new NegotiationError(400, budgetError);

  await pool.query(
    'UPDATE requirements SET title = ?, description = ?, category = ?, budgetMin = ?, budgetMax = ?, timeline = ? WHERE id = ?',
    [next.title, next.description, next.category, next.budgetMin, next.budgetMax, next.timeline, current.id]
  );
  const updated = await loadRequirementVisibleTo(req, current.id);
  return res.json(mapRequirement(updated, companyId));
}));

// Close without awarding (owner)
requirementsRouter.post('/:id/close', ...writeAccess, validateRequest(emptyBodySchema), handle(async (req, res) => {
  const companyId = needCompany(req);
  await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM requirements WHERE id = ? AND deletedAt IS NULL FOR UPDATE', [req.params.id]);
    const current = (rows as Row[])[0];
    if (!current || current.companyId !== companyId) throw new NegotiationError(404, 'Requirement not found');
    if (current.status !== 'open') throw new NegotiationError(409, `This requirement is already ${current.status}`);
    await conn.query(`UPDATE requirements SET status = 'closed' WHERE id = ?`, [current.id]);
    await conn.query(`UPDATE proposals SET status = 'rejected' WHERE requirementId = ? AND status IN ('submitted', 'shortlisted')`, [current.id]);
  });
  const updated = await loadRequirementVisibleTo(req, req.params.id);
  return res.json(mapRequirement(updated, companyId));
}));

// Proposals on one requirement, for side-by-side comparison (owner or admin)
requirementsRouter.get('/:id/proposals', authMiddleware, handle(async (req, res) => {
  const requirement = await loadRequirementVisibleTo(req, req.params.id);
  const mine = !!req.companyId && requirement.companyId === req.companyId;
  if (!mine && req.role !== 'admin') throw new NegotiationError(403, 'Only the company that posted this requirement can see all proposals');

  const sort = String(req.query.sort ?? 'amount');
  const orderBy = sort === 'date' ? 'p.createdAt DESC' : sort === 'timeline' ? 'p.timeline ASC, p.amount ASC' : 'p.amount ASC';
  const [rows] = await pool.query(`${PROPOSAL_SELECT} WHERE p.requirementId = ? ORDER BY ${orderBy}`, [requirement.id]);
  return res.json({ data: (rows as Row[]).map((r) => mapProposal(r, req.companyId)) });
}));

// Send a proposal on a requirement
requirementsRouter.post('/:id/proposals', ...writeAccess, validateRequest(proposalCreateSchema), handle(async (req, res) => {
  const companyId = needCompany(req);
  const b = req.body;

  const [rows] = await pool.query('SELECT * FROM requirements WHERE id = ? AND deletedAt IS NULL', [req.params.id]);
  const requirement = (rows as Row[])[0];
  if (!requirement) throw new NegotiationError(404, 'Requirement not found');
  // Self-dealing guard: a company must not propose on its own requirement (it would fake reputation).
  if (requirement.companyId === companyId) throw new NegotiationError(403, 'You cannot send a proposal to your own requirement');
  if (requirement.status !== 'open') throw new NegotiationError(409, 'This requirement is no longer open');

  const offerError = validateOffer(b, { budgetMin: asNumber(requirement.budgetMin), budgetMax: asNumber(requirement.budgetMax) });
  if (offerError) throw new NegotiationError(400, offerError);

  const proposalId = await withTransaction(async (conn) => {
    const [existingRows] = await conn.query(
      'SELECT id, status, version FROM proposals WHERE requirementId = ? AND companyId = ? FOR UPDATE',
      [requirement.id, companyId]
    );
    const existing = (existingRows as Row[])[0];
    if (existing && existing.status !== 'withdrawn') {
      throw new NegotiationError(409, 'Your company has already sent a proposal for this requirement');
    }
    if (existing) {
      // Re-submitting after withdrawing starts a new revision on the same proposal.
      const version = Number(existing.version) + 1;
      await conn.query(
        `UPDATE proposals SET amount = ?, timeline = ?, message = ?, deliverables = ?, status = 'submitted', lastOfferBy = 'proposer', version = ?, createdBy = ? WHERE id = ?`,
        [b.amount, b.timeline ?? null, b.message ?? null, JSON.stringify(b.deliverables ?? []), version, req.userId, existing.id]
      );
      await insertRevision(conn, existing.id, version, 'proposer', companyId, req.userId!, b);
      return existing.id as string;
    }
    const id = uuidv4();
    await conn.query(
      `INSERT INTO proposals (id, requirementId, companyId, createdBy, amount, timeline, message, deliverables)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, requirement.id, companyId, req.userId, b.amount, b.timeline ?? null, b.message ?? null, JSON.stringify(b.deliverables ?? [])]
    );
    await insertRevision(conn, id, 1, 'proposer', companyId, req.userId!, b);
    return id;
  });

  emitToCompany(requirement.companyId, 'proposals:new', { proposalId, requirementId: requirement.id });
  void notifyCompany(requirement.companyId, {
    kind: 'PROPOSAL_RECEIVED', type: 'success', title: 'New proposal received',
    message: `A proposal of ${b.amount} was sent for "${requirement.title}".`, link: `/app/opportunities/proposals/${proposalId}`,
  });
  void notifyAdmins({
    kind: 'PROPOSAL_SENT', title: 'Proposal sent', message: `A proposal was sent for "${requirement.title}".`,
    actorUserId: req.userId, actorCompanyId: companyId, resourceType: 'proposal', resourceId: proposalId,
  });
  const [created] = await pool.query(`${PROPOSAL_SELECT} WHERE p.id = ?`, [proposalId]);
  return res.status(201).json(mapProposal((created as Row[])[0], companyId));
}));

// =====================================================================================
// /api/proposals
// =====================================================================================
export const proposalsRouter = Router();

// List: scope=sent (I proposed) | received (on my requirements) | all (platform admin)
proposalsRouter.get('/', authMiddleware, handle(async (req, res) => {
  const scope = String(req.query.scope ?? 'sent');
  const { page, limit, offset } = paging(req);
  const where: string[] = [];
  const params: unknown[] = [];

  if (scope === 'all') {
    if (req.role !== 'admin') throw new NegotiationError(403, 'Only platform admins can list all proposals');
  } else if (scope === 'received') {
    where.push('r.companyId = ?');
    params.push(needCompany(req));
  } else {
    where.push('p.companyId = ?');
    params.push(needCompany(req));
  }
  const status = req.query.status ? String(req.query.status) : '';
  if (status && ['submitted', 'shortlisted', 'rejected', 'accepted', 'withdrawn'].includes(status)) {
    where.push('p.status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM proposals p JOIN requirements r ON r.id = p.requirementId AND r.deletedAt IS NULL ${whereSql}`,
    params
  );
  const total = Number((countRows as Row[])[0].total);
  const [rows] = await pool.query(`${PROPOSAL_SELECT} ${whereSql} ORDER BY p.updatedAt DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  return res.json({
    data: (rows as Row[]).map((r) => mapProposal(r, req.companyId)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}));

// One proposal with its full negotiation history (parties and admins only)
proposalsRouter.get('/:id', authMiddleware, handle(async (req, res) => {
  const [rows] = await pool.query(`${PROPOSAL_SELECT} WHERE p.id = ?`, [req.params.id]);
  const row = (rows as Row[])[0];
  if (!row) throw new NegotiationError(404, 'Proposal not found');
  const side = sideOf(req.companyId, row.requirementCompanyId, row.companyId);
  if (!side && req.role !== 'admin') throw new NegotiationError(404, 'Proposal not found');

  const [revRows] = await pool.query(
    `SELECT v.*, c.name AS authorCompanyName FROM proposal_revisions v JOIN companies c ON c.id = v.authorCompanyId
     WHERE v.proposalId = ? ORDER BY v.version ASC`,
    [row.id]
  );
  return res.json({
    ...mapProposal(row, req.companyId),
    revisions: (revRows as Row[]).map((v) => ({
      version: Number(v.version),
      offeredBy: v.offeredBy as Side,
      authorCompanyId: v.authorCompanyId,
      authorCompanyName: v.authorCompanyName,
      amount: Number(v.amount),
      timeline: v.timeline ?? null,
      message: v.message ?? '',
      deliverables: parseDeliverables(v.deliverables),
      createdAt: v.createdAt,
    })),
  });
}));

/** Runs one negotiation action in a transaction with row locks, then returns the fresh proposal. */
async function act(
  req: AuthRequest,
  res: Response,
  action: ProposalAction,
  apply: (ctx: { conn: PoolConnection; requirement: Row; proposal: Row; side: Side; companyId: string }) => Promise<Record<string, unknown> | void>
) {
  const companyId = needCompany(req);
  let extra: Record<string, unknown> = {};
  const loaded: { requirement?: Row; proposal?: Row } = {};

  await withTransaction(async (conn) => {
    const { requirement, proposal } = await loadForUpdate(conn, req.params.id);
    const side = sideOf(companyId, requirement.companyId, proposal.companyId);
    assertAllowed(action, {
      requirementStatus: requirement.status,
      proposalStatus: proposal.status,
      lastOfferBy: proposal.lastOfferBy,
      side,
    });
    extra = (await apply({ conn, requirement, proposal, side: side!, companyId })) ?? {};
    loaded.requirement = requirement;
    loaded.proposal = proposal;
  });

  notifyBoth(loaded.requirement!, loaded.proposal!, 'proposals:updated', { action });
  {
    const other = companyId === loaded.requirement!.companyId ? loaded.proposal!.companyId : loaded.requirement!.companyId;
    const accepted = String(action) === 'accept';
    void notifyCompany(other, {
      kind: 'PROPOSAL_' + String(action).toUpperCase(), type: accepted ? 'success' : 'info',
      title: accepted ? 'Proposal accepted: a deal was created' : ({ counter: 'New counter-offer', shortlist: 'Proposal shortlisted', reject: 'Proposal rejected', withdraw: 'Proposal withdrawn' } as Record<string, string>)[String(action)] ?? 'Proposal updated',
      message: `Update on "${loaded.requirement!.title}".`, link: `/app/opportunities/proposals/${req.params.id}`,
    });
    if (accepted) {
      void notifyAdmins({
        kind: 'DEAL_CREATED', type: 'success', title: 'Deal created', message: `"${loaded.requirement!.title}" was awarded.`,
        actorUserId: req.userId, actorCompanyId: companyId, resourceType: 'proposal', resourceId: req.params.id,
      });
    }
  }
  const [rows] = await pool.query(`${PROPOSAL_SELECT} WHERE p.id = ?`, [req.params.id]);
  return res.json({ ...mapProposal((rows as Row[])[0], companyId), ...extra });
}

// Counter-offer (or the proposer's revised offer). Only the side whose turn it is.
proposalsRouter.post('/:id/offers', ...writeAccess, validateRequest(offerSchema), handle(async (req, res) => {
  const b = req.body;
  return act(req, res, 'counter', async ({ conn, requirement, proposal, side, companyId }) => {
    const offerError = validateOffer(b, { budgetMin: asNumber(requirement.budgetMin), budgetMax: asNumber(requirement.budgetMax) });
    if (offerError) throw new NegotiationError(400, offerError);
    const version = Number(proposal.version) + 1;
    await conn.query(
      'UPDATE proposals SET amount = ?, timeline = ?, message = ?, deliverables = ?, lastOfferBy = ?, version = ? WHERE id = ?',
      [
        b.amount,
        b.timeline ?? proposal.timeline,
        b.message ?? proposal.message,
        JSON.stringify(b.deliverables ?? parseDeliverables(proposal.deliverables)),
        side,
        version,
        proposal.id,
      ]
    );
    await insertRevision(conn, proposal.id, version, side, companyId, req.userId!, {
      amount: b.amount,
      timeline: b.timeline ?? proposal.timeline,
      message: b.message ?? null,
      deliverables: b.deliverables ?? parseDeliverables(proposal.deliverables),
    });
  });
}));

proposalsRouter.post('/:id/shortlist', ...writeAccess, validateRequest(emptyBodySchema), handle(async (req, res) =>
  act(req, res, 'shortlist', async ({ conn, proposal }) => {
    await conn.query(`UPDATE proposals SET status = 'shortlisted' WHERE id = ?`, [proposal.id]);
  })
));

proposalsRouter.post('/:id/reject', ...writeAccess, validateRequest(emptyBodySchema), handle(async (req, res) =>
  act(req, res, 'reject', async ({ conn, proposal }) => {
    await conn.query(`UPDATE proposals SET status = 'rejected' WHERE id = ?`, [proposal.id]);
  })
));

proposalsRouter.post('/:id/withdraw', ...writeAccess, validateRequest(emptyBodySchema), handle(async (req, res) =>
  act(req, res, 'withdraw', async ({ conn, proposal }) => {
    await conn.query(`UPDATE proposals SET status = 'withdrawn' WHERE id = ?`, [proposal.id]);
  })
));

// Accept the latest offer: creates the deal, awards the requirement and closes competing proposals.
proposalsRouter.post('/:id/accept', ...writeAccess, withIdempotency({ required: false, ttlHours: 24 }), validateRequest(emptyBodySchema), handle(async (req, res) =>
  act(req, res, 'accept', async ({ conn, requirement, proposal }) => {
    const deal = dealFromAcceptedProposal(
      { title: requirement.title, description: requirement.description, companyId: requirement.companyId },
      { companyId: proposal.companyId, amount: Number(proposal.amount), message: proposal.message }
    );
    const dealId = uuidv4();
    await conn.query(
      `INSERT INTO deals (id, title, description, buyerId, sellerId, quantity, totalAmount, status)
       VALUES (?, ?, ?, ?, ?, 1, ?, 'pending')`,
      [dealId, deal.title, deal.description, deal.buyerId, deal.sellerId, deal.totalAmount]
    );
    await conn.query(`UPDATE proposals SET status = 'accepted' WHERE id = ?`, [proposal.id]);
    await conn.query(
      `UPDATE proposals SET status = 'rejected' WHERE requirementId = ? AND id <> ? AND status IN ('submitted', 'shortlisted')`,
      [requirement.id, proposal.id]
    );
    await conn.query(
      `UPDATE requirements SET status = 'awarded', awardedProposalId = ?, dealId = ? WHERE id = ?`,
      [proposal.id, dealId, requirement.id]
    );
    return { dealId };
  })
));
