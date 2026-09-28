// Purpose: This module (backend/src/services/paymentReliability.ts) is used to implement project functionality in a modular, maintainable way.
import { v4 as uuidv4 } from 'uuid';
import pool, { withTransaction } from '../config/database.js';
import { enqueue, enqueueDeadLetter, PAYMENT_RETRY_QUEUE } from './queue.js';
import { fetchGatewayPaymentStatus } from './paymentGateway.js';
import { createAuditLog } from '../utils/audit.js';

type ScheduleRetryInput = {
  paymentIntentId: string;
  reason: string;
  requestedByUserId?: string;
  requestedByCompanyId?: string;
};

type RetryRow = {
  id: string;
  paymentIntentId: string;
  status: 'QUEUED' | 'PROCESSING' | 'RETRYING' | 'SUCCEEDED' | 'FAILED' | 'DEAD_LETTER';
  attempts: number;
  maxAttempts: number;
};

export function calculateRetryDelayMs(attempt: number): number {
  const boundedAttempt = Math.max(1, Math.min(attempt, 10));
  return Math.min(30 * 60 * 1000, 1000 * Math.pow(2, boundedAttempt));
}

async function upsertRetryRow(input: ScheduleRetryInput): Promise<RetryRow> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT *
       FROM payment_retry_jobs
       WHERE paymentIntentId = ? AND status IN ('QUEUED', 'PROCESSING', 'RETRYING')
       ORDER BY createdAt DESC
       LIMIT 1`,
      [input.paymentIntentId]
    );

    const existing = (rows as any[])[0] as RetryRow | undefined;
    if (existing) {
      await connection.query(
        `UPDATE payment_retry_jobs
         SET status = 'QUEUED',
             lastError = ?,
             nextRunAt = NOW(),
             updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [input.reason, existing.id]
      );
      return { ...existing, status: 'QUEUED' };
    }

    const id = uuidv4();
    await connection.query(
      `INSERT INTO payment_retry_jobs (id, paymentIntentId, status, attempts, maxAttempts, lastError, nextRunAt)
       VALUES (?, ?, 'QUEUED', 0, 6, ?, NOW())`,
      [id, input.paymentIntentId, input.reason]
    );

    return {
      id,
      paymentIntentId: input.paymentIntentId,
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: 6,
    };
  } finally {
    connection.release();
  }
}

async function syncLedgerForSuccessfulPayment(
  connection: any,
  paymentId: string,
  companyId: string | null,
  dealId: string | null,
  amount: number,
  description: string
) {
  if (!companyId) return;

  const [existingSyncRows] = await connection.query(
    'SELECT paymentId FROM payment_ledger_sync WHERE paymentId = ? LIMIT 1',
    [paymentId]
  );
  if ((existingSyncRows as any[]).length > 0) return;

  const ledgerEntryId = uuidv4();
  await connection.query(
    `INSERT INTO ledger (id, companyId, dealId, type, amount, description)
     VALUES (?, ?, ?, 'debit', ?, ?)`,
    [ledgerEntryId, companyId, dealId, amount, description]
  );
  await connection.query('INSERT INTO payment_ledger_sync (paymentId, ledgerEntryId) VALUES (?, ?)', [
    paymentId,
    ledgerEntryId,
  ]);
}

export async function schedulePaymentRetry(input: ScheduleRetryInput): Promise<{ retryId: string }> {
  const retry = await upsertRetryRow(input);
  const queuedJob = await enqueue(
    PAYMENT_RETRY_QUEUE,
    'payment.retry',
    {
      paymentIntentId: input.paymentIntentId,
      retryId: retry.id,
      reason: input.reason,
    },
    {
      jobId: retry.id,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  if (!queuedJob) {
    await processPaymentRetry(retry.id);
  }

  if (input.requestedByUserId || input.requestedByCompanyId) {
    await createAuditLog({
      userId: input.requestedByUserId,
      companyId: input.requestedByCompanyId,
      action: 'PAYMENT_RETRY_SCHEDULED',
      resourceType: 'payment_intent',
      resourceId: input.paymentIntentId,
      metadata: { retryId: retry.id, reason: input.reason },
    });
  }

  return { retryId: retry.id };
}

export async function processPaymentRetry(retryId: string): Promise<void> {
  const [retryRows] = await pool.query('SELECT * FROM payment_retry_jobs WHERE id = ? LIMIT 1', [retryId]);
  const retry = (retryRows as any[])[0] as RetryRow | undefined;
  if (!retry) return;

  await withTransaction(async (connection) => {
    await connection.query(
      `UPDATE payment_retry_jobs
       SET status = 'PROCESSING',
           attempts = attempts + 1,
           lastTriedAt = NOW()
       WHERE id = ?`,
      [retryId]
    );

    const [intentRows] = await connection.query('SELECT * FROM payment_intents WHERE id = ? LIMIT 1', [
      retry.paymentIntentId,
    ]);
    const intent = (intentRows as any[])[0];
    if (!intent) {
      await connection.query(
        `UPDATE payment_retry_jobs
         SET status = 'DEAD_LETTER', lastError = ?
         WHERE id = ?`,
        ['Payment intent not found', retryId]
      );
      await enqueueDeadLetter(PAYMENT_RETRY_QUEUE, {
        retryId,
        paymentIntentId: retry.paymentIntentId,
        reason: 'Payment intent not found',
      });
      return;
    }

    const status = await fetchGatewayPaymentStatus(String(intent.providerIntentId));
    const [paymentRows] = await connection.query(
      `SELECT *
       FROM payments
       WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.intentId')) = ?
       ORDER BY createdAt DESC
       LIMIT 1`,
      [intent.id]
    );
    const payment = (paymentRows as any[])[0];

    if (status.status === 'SUCCEEDED') {
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
            status.providerPaymentId || intent.providerIntentId,
            JSON.stringify({ intentId: intent.id, source: 'retry_processor' }),
          ]
        );
      } else {
        await connection.query(
          `UPDATE payments
           SET status = 'SUCCEEDED', providerReference = ?, metadata = ?
           WHERE id = ?`,
          [
            status.providerPaymentId || intent.providerIntentId,
            JSON.stringify({ intentId: intent.id, source: 'retry_processor' }),
            paymentId,
          ]
        );
      }

      await syncLedgerForSuccessfulPayment(
        connection,
        paymentId,
        intent.payerCompanyId,
        intent.dealId,
        Number(intent.amount),
        `Gateway payment recovered via retry (${status.providerPaymentId || intent.providerIntentId})`
      );

      await connection.query(
        `UPDATE payment_retry_jobs
         SET status = 'SUCCEEDED', lastError = NULL, nextRunAt = NULL
         WHERE id = ?`,
        [retryId]
      );
      return;
    }

    if (status.status === 'FAILED') {
      await connection.query('UPDATE payment_intents SET status = "FAILED" WHERE id = ?', [intent.id]);
      if (payment?.id) {
        await connection.query(
          `UPDATE payments
           SET status = 'FAILED', providerReference = ?, metadata = ?
           WHERE id = ?`,
          [
            status.providerPaymentId || intent.providerIntentId,
            JSON.stringify({
              intentId: intent.id,
              source: 'retry_processor',
              reason: status.failureReason || null,
            }),
            payment.id,
          ]
        );
      }
      await connection.query(
        `UPDATE payment_retry_jobs
         SET status = 'FAILED', lastError = ?
         WHERE id = ?`,
        [status.failureReason || 'Provider reported failed state', retryId]
      );
      return;
    }

    const [currentRows] = await connection.query('SELECT attempts, maxAttempts FROM payment_retry_jobs WHERE id = ? LIMIT 1', [
      retryId,
    ]);
    const current = (currentRows as any[])[0];
    const attempts = Number(current?.attempts || 0);
    const maxAttempts = Number(current?.maxAttempts || 6);
    if (attempts >= maxAttempts) {
      await connection.query(
        `UPDATE payment_retry_jobs
         SET status = 'DEAD_LETTER', lastError = ?
         WHERE id = ?`,
        ['Exceeded max retries while payment still pending', retryId]
      );
      await enqueueDeadLetter(PAYMENT_RETRY_QUEUE, {
        retryId,
        paymentIntentId: intent.id,
        reason: 'Exceeded max retries while payment still pending',
      });
      return;
    }

    const delayMs = calculateRetryDelayMs(attempts);
    const delaySeconds = Math.max(1, Math.ceil(delayMs / 1000));
    await connection.query(
      `UPDATE payment_retry_jobs
       SET status = 'RETRYING', nextRunAt = DATE_ADD(NOW(), INTERVAL ? SECOND), lastError = ?
       WHERE id = ?`,
      [delaySeconds, `Pending at provider. Next retry in ${delayMs}ms`, retryId]
    );

    const queuedRetry = await enqueue(
      PAYMENT_RETRY_QUEUE,
      'payment.retry',
      {
        paymentIntentId: intent.id,
        retryId,
        reason: 'provider_pending',
      },
      {
        jobId: `${retryId}:${attempts + 1}`,
        delay: delayMs,
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
    if (!queuedRetry) {
      await connection.query(
        `UPDATE payment_retry_jobs
         SET status = 'DEAD_LETTER', lastError = ?
         WHERE id = ?`,
        ['Deferred retry requires BullMQ/Redis worker (REDIS_URL missing)', retryId]
      );
    }
  });
}

export async function runPaymentReconciliation(limit = 100): Promise<{ scheduled: number; totalCandidates: number }> {
  const [rows] = await pool.query(
    `SELECT id
     FROM payment_intents
     WHERE status IN ('CREATED', 'REQUIRES_ACTION')
     ORDER BY createdAt ASC
     LIMIT ?`,
    [Math.max(1, Math.min(limit, 1000))]
  );

  const candidates = rows as Array<{ id: string }>;
  let scheduled = 0;
  for (const intent of candidates) {
    await schedulePaymentRetry({
      paymentIntentId: intent.id,
      reason: 'scheduled_reconciliation',
    });
    scheduled += 1;
  }

  return {
    scheduled,
    totalCandidates: candidates.length,
  };
}
