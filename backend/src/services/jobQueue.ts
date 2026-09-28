// Purpose: This module (backend/src/services/jobQueue.ts) is used to implement project functionality in a modular, maintainable way.
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { enqueue, isBullMqEnabled, JOBS_QUEUE } from './queue.js';

type QueueJobInput = {
  type: string;
  payload?: unknown;
  runAt?: string | null;
};

type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'dead_letter';

function calculateDelayMs(runAt?: string | null): number {
  if (!runAt) return 0;
  const time = new Date(runAt).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, time - Date.now());
}

export async function enqueueJob(input: QueueJobInput): Promise<{ id: string; backend: 'bullmq' | 'database' }> {
  const id = uuidv4();
  const backend = isBullMqEnabled() ? 'bullmq' : 'database';

  const connection = await pool.getConnection();
  try {
    await connection.query(
      'INSERT INTO jobs (id, type, payload, status, runAt, queueBackend) VALUES (?, ?, ?, ?, ?, ?)',
      [id, input.type, input.payload ? JSON.stringify(input.payload) : null, 'queued', input.runAt ?? null, backend]
    );
  } finally {
    connection.release();
  }

  if (backend === 'bullmq') {
    await enqueue(
      JOBS_QUEUE,
      input.type,
      {
        id,
        type: input.type,
        payload: input.payload ?? null,
      },
      {
        jobId: id,
        delay: calculateDelayMs(input.runAt),
        attempts: 5,
        removeOnComplete: true,
        removeOnFail: false,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
  }

  return { id, backend };
}

export async function getQueuedJobs(limit = 50): Promise<any[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(
      `SELECT id, type, payload, status, attempts, lastError, dlqReason, queueBackend, runAt, createdAt, updatedAt
       FROM jobs
       ORDER BY createdAt DESC
       LIMIT ?`,
      [limit]
    );
    return rows as any[];
  } finally {
    connection.release();
  }
}

export async function markJobStatus(id: string, status: JobStatus, lastError?: string, dlqReason?: string): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      `UPDATE jobs
       SET status = ?, attempts = attempts + 1, lastError = ?, dlqReason = ?
       WHERE id = ?`,
      [status, lastError ?? null, dlqReason ?? null, id]
    );
  } finally {
    connection.release();
  }
}
