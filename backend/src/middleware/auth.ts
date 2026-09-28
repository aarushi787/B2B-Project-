// Purpose: This module (backend/src/middleware/auth.ts) is used to implement project functionality in a modular, maintainable way.
import { Request, Response, NextFunction } from 'express';
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

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  authMiddleware(req, res, () => {
    if (req.role !== 'admin') {
      return errorResponse(res, 403, 'FORBIDDEN', 'Access denied. Admin privileges required.');
    }
    return next();
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
