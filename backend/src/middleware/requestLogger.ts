// Purpose: This module (backend/src/middleware/requestLogger.ts) is used to implement project functionality in a modular, maintainable way.
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { observeRequest } from '../observability/metrics.js';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const requestId = (req.headers['x-request-id'] as string | undefined) || randomUUID();
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    observeRequest(req, res, startedAt);
    logger.info({
      event: 'http_request',
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
      userAgent: req.get('user-agent') || null,
    });
  });

  next();
}
