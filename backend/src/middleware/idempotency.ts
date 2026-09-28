// Purpose: This module (backend/src/middleware/idempotency.ts) is used to implement project functionality in a modular, maintainable way.
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import pool from '../config/database.js';
import { errorResponse } from '../utils/http.js';
import { logger } from '../utils/logger.js';

type IdempotencyOptions = {
  required?: boolean;
  ttlHours?: number;
};

export function hashRequestBody(body: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex');
}

function requestPath(req: Request): string {
  return `${req.baseUrl || ''}${req.path}`;
}

export function withIdempotency(options: IdempotencyOptions = {}) {
  const required = options.required ?? false;
  const ttlHours = Math.max(1, Math.min(options.ttlHours ?? 24, 168));

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = (req.header('idempotency-key') || '').trim();
    if (!key) {
      if (required) {
        return errorResponse(res, 400, 'BAD_REQUEST', 'Idempotency key is required');
      }
      return next();
    }

    const reqPath = requestPath(req);
    const requestHash = hashRequestBody(req.body);

    try {
      const [rows] = await pool.query(
        `SELECT requestHash, statusCode, responseBody
         FROM idempotency_keys
         WHERE idempotencyKey = ? AND method = ? AND path = ? AND expiresAt > NOW()
         LIMIT 1`,
        [key, req.method, reqPath]
      );
      const existing = (rows as any[])[0];

      if (existing) {
        if (existing.requestHash !== requestHash) {
          return errorResponse(res, 409, 'BAD_REQUEST', 'Idempotency key reuse with different payload');
        }
        if (existing.statusCode && existing.responseBody) {
          return res.status(existing.statusCode).json(JSON.parse(existing.responseBody));
        }
        return errorResponse(res, 409, 'BAD_REQUEST', 'Request with this idempotency key is already in progress');
      }

      await pool.query(
        `INSERT INTO idempotency_keys (id, idempotencyKey, method, path, requestHash, expiresAt)
         VALUES (UUID(), ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
        [key, req.method, reqPath, requestHash, ttlHours]
      );
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        return errorResponse(res, 409, 'BAD_REQUEST', 'Request with this idempotency key is already in progress');
      }
      return next(error);
    }

    const originalJson = res.json.bind(res);
    let responsePayload: unknown;
    res.json = ((body: unknown) => {
      responsePayload = body;
      return originalJson(body as any);
    }) as Response['json'];

    res.on('finish', () => {
      if (typeof responsePayload === 'undefined') return;
      if (res.statusCode < 200 || res.statusCode >= 600) return;

      pool
        .query(
          `UPDATE idempotency_keys
           SET statusCode = ?, responseBody = ?, completedAt = NOW()
           WHERE idempotencyKey = ? AND method = ? AND path = ?`,
          [res.statusCode, JSON.stringify(responsePayload ?? null), key, req.method, reqPath]
        )
        .catch((error) => {
          logger.error('idempotency_persist_failed', error);
        });
    });

    return next();
  };
}
