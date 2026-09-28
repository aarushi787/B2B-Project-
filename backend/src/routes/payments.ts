// Purpose: This module (backend/src/routes/payments.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { withIdempotency } from '../middleware/idempotency.js';
import { createAuditLog } from '../utils/audit.js';
import { runAmlCheck } from '../services/compliance.js';
import { logger } from '../utils/logger.js';
import {
  emptyBodySchema,
  escrowCreateSchema,
  paymentIntentCreateSchema,
  validateRequest,
} from '../middleware/validation.js';
import { requireCompanyRole } from '../middleware/rbac.js';
import { createGatewayIntent, verifyGatewayWebhookSignature } from '../services/paymentGateway.js';
import { runPaymentReconciliation, schedulePaymentRetry } from '../services/paymentReliability.js';
import { errorResponse } from '../utils/http.js';

const router = Router();

type PaymentIntentRow = {
  id: string;
  escrowId: string | null;
  dealId: string | null;
  payerCompanyId: string | null;
  payeeCompanyId: string | null;
  amount: string;
  currency: string;
  provider: 'RAZORPAY' | 'STRIPE';
  providerIntentId: string;
  idempotencyKey: string;
  status: 'CREATED' | 'REQUIRES_ACTION' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
};

function getIdempotencyKey(req: AuthRequest): string | null {
  const headerValue = req.header('idempotency-key');
  const bodyValue = typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey : undefined;
  return (headerValue || bodyValue || '').trim() || null;
}

async function getIntentByIdempotencyKey(connection: any, idempotencyKey: string): Promise<PaymentIntentRow | null> {
  const [rows] = await connection.query(
    'SELECT * FROM payment_intents WHERE idempotencyKey = ? LIMIT 1',
    [idempotencyKey]
  );
  return ((rows as any[])[0] as PaymentIntentRow) ?? null;
}

async function ensureWebhookEvent(
  connection: any,
  eventId: string,
  eventType: string,
  signatureValid: boolean,
  payload: unknown
): Promise<boolean> {
  try {
    await connection.query(
      `INSERT INTO payment_webhook_events (id, provider, eventId, eventType, signatureValid, payload)
       VALUES (?, 'RAZORPAY', ?, ?, ?, ?)`,
      [uuidv4(), eventId, eventType, signatureValid, JSON.stringify(payload)]
    );
    return true;
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') return false;
    throw error;
  }
}

async function syncLedgerForPayment(
  connection: any,
  paymentId: string,
  companyId: string | null,
  dealId: string | null,
  amount: number,
  description: string
) {
  const [syncRows] = await connection.query('SELECT paymentId FROM payment_ledger_sync WHERE paymentId = ? LIMIT 1', [
    paymentId,
  ]);
  if ((syncRows as any[]).length > 0 || !companyId) return;

  const ledgerEntryId = uuidv4();
  await connection.query(
    'INSERT INTO ledger (id, companyId, dealId, type, amount, description) VALUES (?, ?, ?, ?, ?, ?)',
    [ledgerEntryId, companyId, dealId, 'debit', amount, description]
  );
  await connection.query('INSERT INTO payment_ledger_sync (paymentId, ledgerEntryId) VALUES (?, ?)', [
    paymentId,
    ledgerEntryId,
  ]);
}

// Gateway intent creation (real payment provider order intent)
router.post(
  '/intents',
  authMiddleware,
  requireCompanyRole(['FINANCE']),
  withIdempotency({ required: true, ttlHours: 48 }),
  validateRequest(paymentIntentCreateSchema),
  async (req: AuthRequest, res: Response) => {
    let connection;
    try {
      const idempotencyKey = getIdempotencyKey(req);
      if (!idempotencyKey) {
        return errorResponse(res, 400, 'BAD_REQUEST', 'Idempotency key is required');
      }

      connection = await pool.getConnection();
      const existing = await getIntentByIdempotencyKey(connection, idempotencyKey);
      if (existing) {
        return res.json({
          id: existing.id,
          provider: existing.provider,
          providerIntentId: existing.providerIntentId,
          status: existing.status,
          amount: Number(existing.amount),
          currency: existing.currency,
          idempotencyKey: existing.idempotencyKey,
          duplicate: true,
        });
      }

      let escrowId: string | null = req.body.escrowId ?? null;
      let dealId: string | null = req.body.dealId ?? null;
      let payerCompanyId: string | null = req.body.payerCompanyId ?? null;
      let payeeCompanyId: string | null = req.body.payeeCompanyId ?? null;
      let amount: number | null = req.body.amount ?? null;
      let currency: string = (req.body.currency || 'INR').toUpperCase();

      if (escrowId) {
        const [escrowRows] = await connection.query('SELECT * FROM escrows WHERE id = ? LIMIT 1', [escrowId]);
        const escrow = (escrowRows as any[])[0];
        if (!escrow) {
          return errorResponse(res, 404, 'NOT_FOUND', 'Escrow not found');
        }
        dealId = escrow.dealId ?? dealId;
        payerCompanyId = escrow.payerCompanyId ?? payerCompanyId;
        payeeCompanyId = escrow.payeeCompanyId ?? payeeCompanyId;
        amount = Number(escrow.amount);
        currency = String(escrow.currency || currency).toUpperCase();
      }

      if (!payerCompanyId || !payeeCompanyId || !amount) {
        return errorResponse(
          res,
          400,
          'BAD_REQUEST',
          'Either escrowId or payerCompanyId, payeeCompanyId, amount are required'
        );
      }

      const intentId = uuidv4();
      const gatewayIntent = await createGatewayIntent({
        amount,
        currency,
        receipt: intentId,
        notes: {
          intentId,
          escrowId,
          dealId,
          payerCompanyId,
          payeeCompanyId,
        },
      });

      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO payment_intents (id, escrowId, dealId, payerCompanyId, payeeCompanyId, amount, currency, provider, providerIntentId, idempotencyKey, status, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CREATED', ?)`,
        [
          intentId,
          escrowId,
          dealId,
          payerCompanyId,
          payeeCompanyId,
          amount,
          currency,
          'RAZORPAY',
          gatewayIntent.providerIntentId,
          idempotencyKey,
          JSON.stringify(req.body.metadata ?? {}),
        ]
      );

      await connection.query(
        `INSERT INTO payments (id, escrowId, dealId, companyId, amount, currency, direction, status, provider, providerReference, metadata)
         VALUES (?, ?, ?, ?, ?, ?, 'OUT', 'PENDING', 'razorpay', ?, ?)`,
        [
          uuidv4(),
          escrowId,
          dealId,
          payerCompanyId,
          amount,
          currency,
          gatewayIntent.providerIntentId,
          JSON.stringify({ intentId }),
        ]
      );
      await connection.commit();

      await createAuditLog({
        userId: req.userId,
        companyId: req.companyId,
        action: 'PAYMENT_INTENT_CREATED',
        resourceType: 'payment_intent',
        resourceId: intentId,
        metadata: {
          provider: gatewayIntent.provider,
          providerIntentId: gatewayIntent.providerIntentId,
          escrowId,
          dealId,
          idempotencyKey,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      return res.status(201).json({
        id: intentId,
        provider: gatewayIntent.provider,
        providerIntentId: gatewayIntent.providerIntentId,
        status: 'CREATED',
        amount,
        currency,
        idempotencyKey,
        providerPayload: gatewayIntent.raw,
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch {
          // no-op
        }
      }
      logger.error('Create payment intent error:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create payment intent');
    } finally {
      if (connection) connection.release();
    }
  }
);

// Gateway webhook (no auth; signature validated)
router.post('/webhooks/razorpay', async (req: Request, res: Response) => {
  let connection;
  let retryIntentId: string | null = null;
  try {
    const signature = req.header('x-razorpay-signature') || '';
    const eventId =
      req.header('x-razorpay-event-id') ||
      String((req.body as any)?.payload?.payment?.entity?.id || (req.body as any)?.payload?.order?.entity?.id || uuidv4());
    const eventType = String((req.body as any)?.event || 'unknown');
    const rawBody = (req as any).rawBody as Buffer | undefined;

    if (!rawBody) {
      return errorResponse(res, 400, 'BAD_REQUEST', 'Raw request body is required for webhook signature verification');
    }

    const signatureValid = verifyGatewayWebhookSignature(rawBody, signature);
    connection = await pool.getConnection();

    const inserted = await ensureWebhookEvent(connection, eventId, eventType, signatureValid, req.body);
    if (!inserted) {
      return res.json({ received: true, duplicate: true });
    }

    if (!signatureValid) {
      return errorResponse(res, 400, 'BAD_REQUEST', 'Invalid webhook signature');
    }

    const orderId = String((req.body as any)?.payload?.payment?.entity?.order_id || '');
    const paymentGatewayId = String((req.body as any)?.payload?.payment?.entity?.id || '');
    const failureReason = (req.body as any)?.payload?.payment?.entity?.error_description || null;

    if (!orderId) {
      await connection.query(
        'UPDATE payment_webhook_events SET processedAt = CURRENT_TIMESTAMP WHERE eventId = ?',
        [eventId]
      );
      return res.json({ received: true, ignored: true, reason: 'No order_id in payload' });
    }

    await connection.beginTransaction();

    const [intentRows] = await connection.query('SELECT * FROM payment_intents WHERE providerIntentId = ? LIMIT 1', [orderId]);
    const intent = (intentRows as any[])[0] as PaymentIntentRow | undefined;
    if (!intent) {
      await connection.query(
        'UPDATE payment_webhook_events SET processedAt = CURRENT_TIMESTAMP WHERE eventId = ?',
        [eventId]
      );
      await connection.commit();
      return res.json({ received: true, ignored: true, reason: 'Unknown payment intent' });
    }

    const [paymentRows] = await connection.query(
      `SELECT *
       FROM payments
       WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.intentId')) = ?
       ORDER BY createdAt DESC
       LIMIT 1`,
      [intent.id]
    );
    const payment = (paymentRows as any[])[0];

    if (eventType === 'payment.captured') {
      await connection.query('UPDATE payment_intents SET status = "SUCCEEDED" WHERE id = ?', [intent.id]);
      if (intent.escrowId) {
        await connection.query(
          `UPDATE escrows
           SET status = CASE
             WHEN status IN ('RELEASED', 'REFUNDED', 'FAILED') THEN status
             ELSE 'FUNDED'
           END
           WHERE id = ?`,
          [intent.escrowId]
        );
      }

      let paymentId = payment?.id as string | undefined;
      if (!paymentId) {
        paymentId = uuidv4();
        await connection.query(
          `INSERT INTO payments (id, escrowId, dealId, companyId, amount, currency, direction, status, provider, providerReference, metadata)
           VALUES (?, ?, ?, ?, ?, ?, 'OUT', 'SUCCEEDED', 'razorpay', ?, ?)`,
          [
            paymentId,
            intent.escrowId,
            intent.dealId,
            intent.payerCompanyId,
            intent.amount,
            intent.currency,
            paymentGatewayId || orderId,
            JSON.stringify({ intentId: intent.id, event: eventType }),
          ]
        );
      } else {
        await connection.query(
          `UPDATE payments
           SET status = 'SUCCEEDED', providerReference = ?, metadata = ?
           WHERE id = ?`,
          [
            paymentGatewayId || orderId,
            JSON.stringify({ intentId: intent.id, event: eventType }),
            paymentId,
          ]
        );
      }

      await syncLedgerForPayment(
        connection,
        paymentId,
        intent.payerCompanyId,
        intent.dealId,
        Number(intent.amount),
        `Gateway payment captured (${paymentGatewayId || orderId})`
      );

      await createAuditLog({
        action: 'PAYMENT_WEBHOOK_CAPTURED',
        resourceType: 'payment_intent',
        resourceId: intent.id,
        companyId: intent.payerCompanyId ?? undefined,
        metadata: {
          eventId,
          eventType,
          providerIntentId: orderId,
          providerPaymentId: paymentGatewayId || null,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } else if (eventType === 'payment.failed') {
      await connection.query('UPDATE payment_intents SET status = "FAILED" WHERE id = ?', [intent.id]);
      retryIntentId = intent.id;

      if (payment?.id) {
        await connection.query(
          `UPDATE payments
           SET status = 'FAILED', providerReference = ?, metadata = ?
           WHERE id = ?`,
          [
            paymentGatewayId || orderId,
            JSON.stringify({ intentId: intent.id, event: eventType, reason: failureReason }),
            payment.id,
          ]
        );
      }

      await createAuditLog({
        action: 'PAYMENT_WEBHOOK_FAILED',
        resourceType: 'payment_intent',
        resourceId: intent.id,
        companyId: intent.payerCompanyId ?? undefined,
        metadata: {
          eventId,
          eventType,
          providerIntentId: orderId,
          reason: failureReason,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    }

    await connection.query(
      'UPDATE payment_webhook_events SET processedAt = CURRENT_TIMESTAMP WHERE eventId = ?',
      [eventId]
    );
    await connection.commit();

    if (retryIntentId) {
      await schedulePaymentRetry({
        paymentIntentId: retryIntentId,
        reason: 'webhook_payment_failed',
      });
    }
    return res.json({ received: true });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // no-op
      }
    }
    logger.error('Razorpay webhook error:', error);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to process webhook');
  } finally {
    if (connection) connection.release();
  }
});

router.post(
  '/intents/:id/retry',
  authMiddleware,
  requireCompanyRole(['FINANCE']),
  withIdempotency({ required: true, ttlHours: 24 }),
  validateRequest(emptyBodySchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await schedulePaymentRetry({
        paymentIntentId: req.params.id,
        reason: 'manual_retry_request',
        requestedByUserId: req.userId,
        requestedByCompanyId: req.companyId,
      });
      return res.status(202).json({
        paymentIntentId: req.params.id,
        retryId: result.retryId,
        status: 'QUEUED',
      });
    } catch (error) {
      logger.error('Schedule payment retry error:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to schedule payment retry');
    }
  }
);

router.post(
  '/reconcile',
  authMiddleware,
  requireCompanyRole(['FINANCE']),
  withIdempotency({ required: true, ttlHours: 6 }),
  validateRequest(emptyBodySchema),
  async (_req: AuthRequest, res: Response) => {
    try {
      const result = await runPaymentReconciliation(200);
      return res.status(202).json({
        status: 'QUEUED',
        ...result,
      });
    } catch (error) {
      logger.error('Payment reconciliation error:', error);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to reconcile pending payments');
    }
  }
);

router.post(
  '/escrows',
  authMiddleware,
  requireCompanyRole(['FINANCE']),
  withIdempotency({ required: true, ttlHours: 48 }),
  validateRequest(escrowCreateSchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    const { dealId, payerCompanyId, payeeCompanyId, amount, currency, paymentProvider } = req.body;
    if (!dealId || !payerCompanyId || !payeeCompanyId || !amount) {
      return res.status(400).json({ error: 'dealId, payerCompanyId, payeeCompanyId and amount are required' });
    }

    const escrowId = uuidv4();
    const providerReference = `escrow_${Date.now()}`;
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO escrows (id, dealId, payerCompanyId, payeeCompanyId, amount, currency, status, paymentProvider, providerReference)
       VALUES (?, ?, ?, ?, ?, ?, 'CREATED', ?, ?)`,
      [escrowId, dealId, payerCompanyId, payeeCompanyId, amount, currency || 'USD', paymentProvider || 'manual', providerReference]
    );
    await connection.commit();

    await createAuditLog({
      userId: req.userId,
      companyId: req.companyId,
      action: 'ESCROW_CREATED',
      resourceType: 'escrow',
      resourceId: escrowId,
      metadata: { dealId, amount, currency: currency || 'USD' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ id: escrowId, dealId, status: 'CREATED', providerReference });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // no-op
      }
    }
    logger.error('Create escrow error:', error);
    res.status(500).json({ error: 'Failed to create escrow' });
  } finally {
    if (connection) connection.release();
  }
  }
);

router.post(
  '/escrows/:id/fund',
  authMiddleware,
  requireCompanyRole(['FINANCE']),
  withIdempotency({ required: true, ttlHours: 48 }),
  validateRequest(emptyBodySchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM escrows WHERE id = ?', [req.params.id]);
    const escrow = (rows as any[])[0];
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }
    if (escrow.status !== 'PENDING') {
      return res.status(400).json({ error: 'Escrow cannot be funded (invalid status)' });
    }

    const aml = await runAmlCheck({
      dealId: escrow.dealId,
      escrowId: escrow.id,
      companyId: escrow.payerCompanyId,
      amount: Number(escrow.amount),
      currency: escrow.currency,
      metadata: { operation: 'escrow_fund' },
    });
    if (aml.decision === 'BLOCK') {
      return res.status(403).json({
        error: 'Transaction blocked by AML policy',
        aml,
      });
    }

    await connection.beginTransaction();
    
    const [locked] = await connection.query('SELECT status FROM escrows WHERE id = ? FOR UPDATE', [req.params.id]);
    if ((locked as any[])[0].status !== 'PENDING') {
      await connection.rollback();
      return res.status(400).json({ error: 'Escrow was modified concurrently' });
    }

    await connection.query('UPDATE escrows SET status = "FUNDED" WHERE id = ?', [req.params.id]);
    await connection.query(
      `INSERT INTO payments (id, escrowId, dealId, companyId, amount, currency, direction, status, provider, providerReference, metadata)
       VALUES (?, ?, ?, ?, ?, ?, 'OUT', 'SUCCEEDED', ?, ?, ?)`,
      [
        uuidv4(),
        escrow.id,
        escrow.dealId,
        escrow.payerCompanyId,
        escrow.amount,
        escrow.currency,
        escrow.paymentProvider || 'manual',
        `fund_${Date.now()}`,
        JSON.stringify({ operation: 'escrow_fund' }),
      ]
    );
    await connection.commit();

    await createAuditLog({
      userId: req.userId,
      companyId: escrow.payerCompanyId,
      action: 'ESCROW_FUNDED',
      resourceType: 'escrow',
      resourceId: escrow.id,
      metadata: { amount: escrow.amount, currency: escrow.currency },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ id: req.params.id, status: 'FUNDED' });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // no-op
      }
    }
    logger.error('Fund escrow error:', error);
    res.status(500).json({ error: 'Failed to fund escrow' });
  } finally {
    if (connection) connection.release();
  }
  }
);

router.post(
  '/escrows/:id/release',
  authMiddleware,
  requireCompanyRole(['FINANCE']),
  withIdempotency({ required: true, ttlHours: 48 }),
  validateRequest(emptyBodySchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM escrows WHERE id = ?', [req.params.id]);
    const escrow = (rows as any[])[0];
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }
    if (escrow.status !== 'FUNDED') {
      return res.status(400).json({ error: 'Escrow cannot be released (must be FUNDED)' });
    }

    const aml = await runAmlCheck({
      dealId: escrow.dealId,
      escrowId: escrow.id,
      companyId: escrow.payeeCompanyId,
      amount: Number(escrow.amount),
      currency: escrow.currency,
      metadata: { operation: 'escrow_release' },
    });
    if (aml.decision === 'BLOCK') {
      return res.status(403).json({
        error: 'Transaction blocked by AML policy',
        aml,
      });
    }

    await connection.beginTransaction();
    
    const [locked] = await connection.query('SELECT status FROM escrows WHERE id = ? FOR UPDATE', [req.params.id]);
    if ((locked as any[])[0].status !== 'FUNDED') {
      await connection.rollback();
      return res.status(400).json({ error: 'Escrow was modified concurrently' });
    }

    await connection.query('UPDATE escrows SET status = "RELEASED" WHERE id = ?', [req.params.id]);
    await connection.query(
      `INSERT INTO payments (id, escrowId, dealId, companyId, amount, currency, direction, status, provider, providerReference, metadata)
       VALUES (?, ?, ?, ?, ?, ?, 'IN', 'SUCCEEDED', ?, ?, ?)`,
      [
        uuidv4(),
        escrow.id,
        escrow.dealId,
        escrow.payeeCompanyId,
        escrow.amount,
        escrow.currency,
        escrow.paymentProvider || 'manual',
        `release_${Date.now()}`,
        JSON.stringify({ operation: 'escrow_release' }),
      ]
    );
    await connection.commit();

    await createAuditLog({
      userId: req.userId,
      companyId: escrow.payeeCompanyId,
      action: 'ESCROW_RELEASED',
      resourceType: 'escrow',
      resourceId: escrow.id,
      metadata: { amount: escrow.amount, currency: escrow.currency },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ id: req.params.id, status: 'RELEASED' });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // no-op
      }
    }
    logger.error('Release escrow error:', error);
    res.status(500).json({ error: 'Failed to release escrow' });
  } finally {
    if (connection) connection.release();
  }
  }
);

router.get('/escrows', authMiddleware, requireCompanyRole(['FINANCE']), async (_req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM escrows ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    logger.error('List escrows error:', error);
    res.status(500).json({ error: 'Failed to fetch escrows' });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/transactions', authMiddleware, requireCompanyRole(['FINANCE']), async (_req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM payments ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    logger.error('List payments error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
