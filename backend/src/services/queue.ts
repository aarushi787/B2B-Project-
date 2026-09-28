// Purpose: This module (backend/src/services/queue.ts) is used to implement project functionality in a modular, maintainable way.
import { Job, JobsOptions, Queue, QueueEvents, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../utils/logger.js';

export const JOBS_QUEUE = 'b2b:jobs';
export const PAYMENT_RETRY_QUEUE = 'b2b:payment-retries';
export const DLQ_QUEUE = 'b2b:dlq';

type QueueName = typeof JOBS_QUEUE | typeof PAYMENT_RETRY_QUEUE | typeof DLQ_QUEUE;

let redisConnection: IORedis | null = null;
const queueMap = new Map<QueueName, Queue>();

function hasRedisConfig(): boolean {
  return Boolean(process.env.REDIS_URL);
}

function getRedisConnection(): IORedis {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not configured');
  }
  if (!redisConnection) {
    redisConnection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }
  return redisConnection;
}

export function isBullMqEnabled(): boolean {
  return hasRedisConfig();
}

export function getQueue(name: QueueName): Queue {
  const existing = queueMap.get(name);
  if (existing) return existing;

  const queue = new Queue(name, { connection: getRedisConnection() });
  queueMap.set(name, queue);
  return queue;
}

export async function enqueue(
  queueName: QueueName,
  name: string,
  data: Record<string, unknown>,
  options?: JobsOptions
): Promise<Job | null> {
  if (!isBullMqEnabled()) return null;
  const queue = getQueue(queueName);
  return queue.add(name, data, options);
}

export async function enqueueDeadLetter(sourceQueue: QueueName, payload: Record<string, unknown>): Promise<void> {
  const dlqPayload = {
    sourceQueue,
    failedAt: new Date().toISOString(),
    ...payload,
  };
  await enqueue(DLQ_QUEUE, 'dead-letter', dlqPayload, {
    removeOnComplete: false,
    removeOnFail: false,
  });
}

type WorkerConfig<TData extends Record<string, unknown>> = {
  queue: QueueName;
  handler: (job: Job<TData>) => Promise<void>;
  name?: string;
  attempts?: number;
};

export function createWorker<TData extends Record<string, unknown>>(config: WorkerConfig<TData>): Worker<TData> | null {
  if (!isBullMqEnabled()) {
    logger.warn({ queue: config.queue }, 'BullMQ disabled (REDIS_URL missing), worker not started');
    return null;
  }

  const worker = new Worker<TData>(
    config.queue,
    async (job) => {
      await config.handler(job);
    },
    {
      connection: getRedisConnection(),
      concurrency: 4,
    }
  );

  const workerName = config.name || config.queue;
  const events = new QueueEvents(config.queue, { connection: getRedisConnection() });
  events.on('failed', async ({ jobId, failedReason }) => {
    await enqueueDeadLetter(config.queue, {
      worker: workerName,
      jobId: jobId ?? null,
      failedReason,
    });
  });

  worker.on('failed', (job, error) => {
    logger.error(
      {
        queue: config.queue,
        worker: workerName,
        jobId: job?.id ?? null,
      },
      `worker_failed: ${error?.message || 'unknown error'}`
    );
  });

  worker.on('completed', (job) => {
    logger.info(
      {
        queue: config.queue,
        worker: workerName,
        jobId: job.id,
      },
      'worker_completed'
    );
  });

  return worker;
}

export async function closeQueueResources() {
  for (const queue of queueMap.values()) {
    await queue.close();
  }
  queueMap.clear();

  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
