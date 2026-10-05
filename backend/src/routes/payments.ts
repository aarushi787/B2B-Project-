// Escrow for deal milestones. The client pays by card; the money is only AUTHORISED (held), not captured. It is released
// to the provider when the client confirms the milestone (see routes/milestones.ts).
//
// Security rules for everything here:
//   - Every route needs a signed-in user. Only the BUYER of the deal can fund its milestones.
//   - The amount and currency come from our database, never from the request.
//   - "Funded" is only recorded after we ask the payment provider ourselves and see the money is held.
//   - Without STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY nothing pretends to work: the API answers 503.
import { Router, Response, Request } from 'express';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { requireCompanyRole } from '../middleware/rbac.js';
import { validateRequest, emptyBodySchema } from '../middleware/validation.js';
import { ApiError, errorResponse } from '../utils/http.js';
import { createAuditLog } from '../utils/audit.js';
import { logger } from '../utils/logger.js';
import { notifyCompany } from '../services/notify.js';
import { emitToCompany } from '../realtime/socket.js';
import { getStripe, paymentsEnabled } from '../services/stripeClient.js';
import { amountToSubunits } from '../services/paymentGateway.js';

const router = Router();
const payAccess = [authMiddleware, requireCompanyRole(['OWNER', 'ADMIN', 'FINANCE'])] as const;

const handle = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => (req: Request, res: Response) => {
  fn(req as AuthRequest, res).catch((err) => {
    if (err instanceof ApiError) return errorResponse(res, err.status, err.code, err.message);
    logger.error('Payments route error:', err);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  });
};

// Tells the app whether escrow is available, and gives it the PUBLIC key the card form needs. Never the secret key.
router.get('/config', authMiddleware, (_req: Request, res: Response) => {
  const enabled = paymentsEnabled();
  res.json({ enabled, provider: 'stripe', publishableKey: enabled ? process.env.STRIPE_PUBLISHABLE_KEY : null });
});

async function loadFundable(req: AuthRequest) {
  const stripe = getStripe();
  if (!stripe || !paymentsEnabled()) {
    throw new ApiError(503, 'PAYMENTS_NOT_CONFIGURED', 'Escrow payments are not set up on this platform yet.');
  }
  const [rows] = await pool.query(
    `SELECT m.id, m.dealId, m.title, m.amount, m.currency, m.status, m.escrowStatus, m.paymentIntentId,
            d.title AS dealTitle, d.buyerId, d.sellerId
     FROM milestones m JOIN deals d ON d.id = m.dealId AND d.deletedAt IS NULL
     WHERE m.id = ? AND m.deletedAt IS NULL`,
    [req.params.id]
  );
  const m = (rows as any[])[0];
  if (!m || (m.buyerId !== req.companyId && m.sellerId !== req.companyId)) throw new ApiError(404, 'NOT_FOUND', 'Milestone not found');
  if (m.buyerId !== req.companyId) throw new ApiError(403, 'FORBIDDEN', 'Only the client can fund a milestone');
  if (m.escrowStatus !== 'NOT_FUNDED') throw new ApiError(409, 'CONFLICT', 'This milestone already has escrow funds');
  if (m.status === 'APPROVED') throw new ApiError(409, 'CONFLICT', 'This milestone is already confirmed');
  if (!(Number(m.amount) > 0)) throw new ApiError(400, 'BAD_REQUEST', 'This milestone has no amount to hold');
  return { stripe, m };
}

async function markFunded(req: AuthRequest, m: any) {
  // Only moves NOT_FUNDED -> FUNDED, so repeating the call is harmless.
  await pool.query("UPDATE milestones SET escrowStatus = 'FUNDED' WHERE id = ? AND escrowStatus = 'NOT_FUNDED'", [m.id]);
  await createAuditLog({ userId: req.userId, companyId: req.companyId, action: 'ESCROW_FUNDED', resourceType: 'milestone', resourceId: m.id, metadata: { dealId: m.dealId, amount: Number(m.amount) }, ipAddress: req.ip, userAgent: req.get('user-agent') });
  void notifyCompany(m.sellerId, { kind: 'ESCROW_FUNDED', type: 'success', title: 'Escrow funded', message: `The client has put funds on hold for "${m.title}" in ${m.dealTitle}.`, link: `/app/deals/${m.dealId}` });
  emitToCompany(m.sellerId, 'milestones:updated', { dealId: m.dealId });
  emitToCompany(m.buyerId, 'milestones:updated', { dealId: m.dealId });
}

// Step 1: start (or resume) the hold. Returns the secret the card form needs.
router.post('/milestones/:id/escrow', ...payAccess, validateRequest(emptyBodySchema), handle(async (req, res) => {
  const { stripe, m } = await loadFundable(req);
  const amount = amountToSubunits(Number(m.amount), m.currency);

  if (m.paymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(m.paymentIntentId);
    if (existing.status === 'requires_capture') {
      await markFunded(req, m);
      return res.json({ funded: true });
    }
    if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existing.status) && existing.amount === amount) {
      return res.json({ clientSecret: existing.client_secret, amount: Number(m.amount), currency: m.currency });
    }
  }

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: String(m.currency).toLowerCase(),
    capture_method: 'manual', // hold the money; it is captured only when the client confirms the milestone
    automatic_payment_methods: { enabled: true },
    description: `Escrow: ${m.title} (${m.dealTitle})`,
    metadata: { milestoneId: m.id, dealId: m.dealId, buyerCompanyId: m.buyerId },
  }, { idempotencyKey: `escrow-${m.id}-${amount}-${m.paymentIntentId ?? 'new'}` });

  await pool.query('UPDATE milestones SET paymentIntentId = ? WHERE id = ?', [intent.id, m.id]);
  return res.json({ clientSecret: intent.client_secret, amount: Number(m.amount), currency: m.currency });
}));

// Step 2: after the card form succeeds, check with the provider that the money really is on hold.
router.post('/milestones/:id/confirm', ...payAccess, validateRequest(emptyBodySchema), handle(async (req, res) => {
  const { stripe, m } = await loadFundable(req);
  if (!m.paymentIntentId) throw new ApiError(409, 'CONFLICT', 'Start the escrow payment first');

  const intent = await stripe.paymentIntents.retrieve(m.paymentIntentId);
  const expected = amountToSubunits(Number(m.amount), m.currency);
  if (intent.metadata?.milestoneId !== m.id || intent.amount !== expected) {
    throw new ApiError(409, 'CONFLICT', 'The payment does not match this milestone');
  }
  if (intent.status !== 'requires_capture') {
    throw new ApiError(409, 'CONFLICT', 'The payment provider does not show funds on hold yet. If you just paid, wait a moment and try again.');
  }
  await markFunded(req, m);
  return res.json({ funded: true });
}));

export default router;
