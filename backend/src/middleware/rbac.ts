// Purpose: This module (backend/src/middleware/rbac.ts) is used to implement project functionality in a modular, maintainable way.
import { NextFunction, Response } from 'express';
import pool from '../config/database.js';
import { AuthRequest } from './auth.js';
import { errorResponse } from '../utils/http.js';

export type CompanyRole = 'OWNER' | 'ADMIN' | 'FINANCE' | 'LEGAL' | 'OPS' | 'VIEWER';

type RequireCompanyRoleOptions = {
  allowPlatformAdmin?: boolean;
  resolveCompanyId?: (req: AuthRequest) => string | null | undefined;
};

const DEFAULT_RESOLVER = (req: AuthRequest) =>
  (req.companyId ?? (req.body as { companyId?: string })?.companyId ?? req.params.companyId ?? null);

async function resolveCompanyRole(userId: string, companyId: string): Promise<CompanyRole | null> {
  const connection = await pool.getConnection();
  try {
    const [memberRows] = await connection.query(
      `SELECT role
       FROM company_members
       WHERE userId = ? AND companyId = ? AND status = 'ACTIVE'
       LIMIT 1`,
      [userId, companyId]
    );

    const memberRole = (memberRows as any[])[0]?.role as CompanyRole | undefined;
    if (memberRole) return memberRole;

    const [ownerRows] = await connection.query(
      `SELECT id
       FROM companies
       WHERE id = ? AND userId = ?
       LIMIT 1`,
      [companyId, userId]
    );
    if ((ownerRows as any[]).length > 0) {
      return 'OWNER';
    }

    return null;
  } finally {
    connection.release();
  }
}

export function requireCompanyRole(
  allowedRoles: CompanyRole[],
  options: RequireCompanyRoleOptions = {}
) {
  const allowPlatformAdmin = options.allowPlatformAdmin ?? true;
  const resolveCompanyId = options.resolveCompanyId ?? DEFAULT_RESOLVER;

  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
      }

      if (allowPlatformAdmin && req.role === 'admin') {
        return next();
      }

      const companyId = resolveCompanyId(req);
      if (!companyId) {
        return errorResponse(res, 400, 'BAD_REQUEST', 'companyId context is required for role enforcement');
      }

      const companyRole = await resolveCompanyRole(req.userId, companyId);
      req.companyRole = companyRole ?? undefined;

      if (!companyRole || !allowedRoles.includes(companyRole)) {
        return errorResponse(
          res,
          403,
          'FORBIDDEN',
          'Insufficient role permissions',
          { requiredRoles: allowedRoles, actualRole: companyRole ?? null }
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

