// Purpose: This module (backend/src/routes/admin.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { adminCreateUserSchema, adminUpdateUserSchema, validateRequest } from '../middleware/validation.js';
import { requireCompanyRole } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';
import { getQueue, isBullMqEnabled, DLQ_QUEUE, PAYMENT_RETRY_QUEUE } from '../services/queue.js';

const router = Router();
const adminAccess = [authMiddleware, requireCompanyRole(['ADMIN', 'OWNER'])] as const;

// --- User Management ---

// Get all users
router.get('/users', ...adminAccess, async (_req: AuthRequest, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const [users] = await connection.query('SELECT id, email, phone, firstName, lastName, role, createdAt FROM users');
    connection.release();
    res.json(users);
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

    const connection = await pool.getConnection();
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    if ((existing as any[]).length > 0) {
      connection.release();
      return res.status(409).json({ error: 'User already exists' });
    }

    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.query(
      'INSERT INTO users (id, email, password, firstName, lastName, phone, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, email, hashedPassword, firstName, lastName, phone, role || 'buyer']
    );
    connection.release();
    res.status(201).json({ id, email, firstName, lastName, role });
  } catch (error) {
    logger.error('Admin create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', ...adminAccess, validateRequest(adminUpdateUserSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email, firstName, lastName, phone, role, password } = req.body;
    const connection = await pool.getConnection();
    
    let query = 'UPDATE users SET email = COALESCE(?, email), firstName = COALESCE(?, firstName), lastName = COALESCE(?, lastName), phone = COALESCE(?, phone), role = COALESCE(?, role)';
    const params = [email, firstName, lastName, phone, role];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(req.params.id);

    await connection.query(query, params);
    connection.release();
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    logger.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', ...adminAccess, async (req: AuthRequest, res: Response) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    connection.release();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- Company Management (Proxying to common logic but with Admin check) ---

// Get all companies (Admin view)
router.get('/companies', ...adminAccess, async (_req: AuthRequest, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const [companies] = await connection.query('SELECT * FROM companies');
    connection.release();
    res.json(companies);
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
    connection = await pool.getConnection();

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
    if (connection) connection.release();
  }
});

export default router;
