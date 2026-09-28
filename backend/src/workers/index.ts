// Purpose: This module (backend/src/workers/index.ts) is used to implement project functionality in a modular, maintainable way.
import dotenv from 'dotenv';
import { Job } from 'bullmq';
import { createWorker, JOBS_QUEUE, PAYMENT_RETRY_QUEUE } from '../services/queue.js';
import { logger } from '../utils/logger.js';
import { markJobStatus } from '../services/jobQueue.js';
import { processPaymentRetry } from '../services/paymentReliability.js';

dotenv.config();

type GenericJobData = {
  id: string;
  type: string;
  payload?: unknown;
};

const genericWorker = createWorker<GenericJobData>({
  queue: JOBS_QUEUE,
  name: 'generic-jobs-worker',
  handler: async (job: Job<GenericJobData>) => {
    const jobId = String(job.data?.id || job.id);
    await markJobStatus(jobId, 'processing');
    try {
      // Hook point for async side effects (email, notifications, exports, etc.).
      await markJobStatus(jobId, 'completed');
    } catch (error: any) {
      await markJobStatus(jobId, 'failed', error?.message || 'Job processing failed');
      throw error;
    }
  },
});

type PaymentRetryJobData = {
  retryId: string;
  paymentIntentId: string;
  reason: string;
};

const paymentRetryWorker = createWorker<PaymentRetryJobData>({
  queue: PAYMENT_RETRY_QUEUE,
  name: 'payment-retry-worker',
  handler: async (job: Job<PaymentRetryJobData>) => {
    await processPaymentRetry(job.data.retryId);
  },
});

if (!genericWorker && !paymentRetryWorker) {
  logger.warn('No worker started. Configure REDIS_URL to enable BullMQ workers.');
} else {
  logger.info('Workers started');
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
