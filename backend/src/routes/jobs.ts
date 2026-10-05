// Purpose: This module (backend/src/routes/jobs.ts) is used to implement job queue API operations in a modular, maintainable way.
import { Router, Response } from 'express';
import { adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { enqueueJob, getQueuedJobs, markJobStatus } from '../services/jobQueue.js';
import { createAuditLog } from '../utils/audit.js';
import { jobCreateSchema, jobStatusUpdateSchema, validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import { withIdempotency } from '../middleware/idempotency.js';

const router = Router();

router.post(
  '/',
  adminMiddleware,
  withIdempotency({ required: true, ttlHours: 48 }),
  validateRequest(jobCreateSchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const { type, payload, runAt } = req.body as { type?: string; payload?: unknown; runAt?: string | null };
    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }
    const job = await enqueueJob({ type, payload, runAt: runAt ?? null });

    await createAuditLog({
      userId: req.userId,
      companyId: req.companyId,
      action: 'JOB_ENQUEUED',
      resourceType: 'job',
      resourceId: job.id,
      metadata: { type, backend: job.backend },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json(job);
  } catch (error) {
    logger.error('Enqueue job error:', error);
    res.status(500).json({ error: 'Failed to enqueue job' });
  }
  }
);

router.get('/', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const jobs = await getQueuedJobs(limit);
    res.json(jobs);
  } catch (error) {
    logger.error('List jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.put('/:id/status', adminMiddleware, validateRequest(jobStatusUpdateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const status = req.body.status as 'processing' | 'completed' | 'failed' | 'dead_letter';
    if (!['processing', 'completed', 'failed', 'dead_letter'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use processing, completed, failed, or dead_letter.' });
    }
    await markJobStatus(req.params.id, status, req.body.lastError);
    res.json({ id: req.params.id, status });
  } catch (error) {
    logger.error('Update job status error:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

export default router;


