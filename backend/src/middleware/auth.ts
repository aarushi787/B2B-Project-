// Purpose: This module (backend/src/middleware/auth.ts) is used to implement project functionality in a modular, maintainable way.
import { Request, Response, NextFunction } from 'express';
import pool from '../config/database.js';
import { getAccessTokenFromRequest, verifyAccessToken } from '../services/tokens.js';
import { ApiError, errorResponse } from '../utils/http.js';
import { logger } from '../utils/logger.js';
import { Sentry } from '../observability/sentry.js';

export interface AuthRequest extends Request {
  userId?: string;
  companyId?: string;
  role?: string;
  companyRole?: 'OWNER' | 'ADMIN' | 'FINANCE' | 'LEGAL' | 'OPS' | 'VIEWER';
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = getAccessTokenFromRequest(req);

  if (!token) {
    return errorResponse(res, 401, 'UNAUTHORIZED', 'No token provided');
  }

  try {
    const decoded = verifyAccessToken(token);

    if (decoded.type !== 'access') {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid token type');
    }

    req.userId = decoded.userId;
    req.companyId = decoded.companyId ?? undefined;
    req.role = decoded.role;
    return next();
  } catch (error: any) {
    const errorMsg = error?.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return errorResponse(res, 401, 'UNAUTHORIZED', errorMsg);
  }
};

// The role inside a signed token is only a claim from when it was issued. For admin work we look the user up again, so a
// demoted or suspended admin loses access at once instead of keeping it until the token expires.
export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  authMiddleware(req, res, async () => {
    if (req.role !== 'admin') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Access denied. Admin privileges required.');
    }
    try {
      const [rows] = await pool.query('SELECT role, suspendedAt FROM users WHERE id = ?', [req.userId]);
      const row = (rows as { role: string; suspendedAt: Date | null }[])[0];
      if (!row || row.role !== 'admin' || row.suspendedAt) {
        return errorResponse(res, 403, 'FORBIDDEN', 'Access denied. Admin privileges required.');
      }
      return next();
    } catch (error) {
      logger.error('admin_role_check_failed', error);
      // A column that does not exist means the database is behind this version of the app. Say so, instead of a vague error.
      if ((error as { code?: string })?.code === 'ER_BAD_FIELD_ERROR') {
        return errorResponse(res, 503, 'INTERNAL_ERROR', 'The database needs updating. Restart the backend, or run "npm run db:init" in the backend folder.');
      }
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Could not verify admin access.');
    }
  });
};

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error(err);
  Sentry.captureException(err);
  if (err instanceof ApiError) {
    return errorResponse(res, err.status, err.code, err.message, err.details);
  }
  return errorResponse(res, err?.status || 500, 'INTERNAL_ERROR', err?.message || 'Internal server error');
};
