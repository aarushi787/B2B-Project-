// Company members and their roles. Everything here is about ONE company, so every handler first proves the caller
// may act for that company: a platform admin, or an OWNER/ADMIN of it (anyone active in it, for just listing).
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { resolveCompanyRole, type CompanyRole } from '../middleware/rbac.js';
import { createAuditLog } from '../utils/audit.js';
import { memberInviteSchema, memberRoleUpdateSchema, validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

const router = Router();

const ALLOWED_ROLES = new Set(['OWNER', 'ADMIN', 'FINANCE', 'LEGAL', 'OPS', 'VIEWER']);

/** The caller's role in `companyId`, or 'PLATFORM_ADMIN', or null when they have no standing there. */
async function callerStanding(req: AuthRequest, companyId: string): Promise<CompanyRole | 'PLATFORM_ADMIN' | null> {
  if (req.role === 'admin') return 'PLATFORM_ADMIN';
  if (!req.userId) return null;
  return resolveCompanyRole(req.userId, companyId);
}

const canManage = (standing: CompanyRole | 'PLATFORM_ADMIN' | null) => standing === 'PLATFORM_ADMIN' || standing === 'OWNER' || standing === 'ADMIN';

router.get('/company/:companyId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!(await callerStanding(req, req.params.companyId))) {
      return res.status(404).json({ error: 'Company not found' });
    }
    const [rows] = await pool.query(
      `SELECT cm.id, cm.userId, cm.companyId, cm.role, cm.status, cm.invitedBy, cm.createdAt, cm.updatedAt, u.email, u.firstName, u.lastName
       FROM company_members cm
       INNER JOIN users u ON u.id = cm.userId
       WHERE cm.companyId = ?
       ORDER BY cm.createdAt DESC`,
      [req.params.companyId]
    );
    res.json(rows);
  } catch (error) {
    logger.error('List company members error:', error);
    res.status(500).json({ error: 'Failed to fetch company members' });
  }
});

router.post('/invite', authMiddleware, validateRequest(memberInviteSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, userId, role } = req.body as { companyId?: string; userId?: string; role?: string };
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'companyId and userId are required' });
    }

    const memberRole = (role || 'VIEWER').toUpperCase();
    if (!ALLOWED_ROLES.has(memberRole)) {
      return res.status(400).json({ error: 'Invalid role. Use OWNER, ADMIN, FINANCE, LEGAL, OPS, or VIEWER.' });
    }

    const standing = await callerStanding(req, companyId);
    if (!canManage(standing)) return res.status(404).json({ error: 'Company not found' });
    // Only an owner (or the platform) can create another owner.
    if (memberRole === 'OWNER' && standing === 'ADMIN') {
      return res.status(403).json({ error: 'Only an owner can invite another owner' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO company_members (id, userId, companyId, role, status, invitedBy)
       VALUES (?, ?, ?, ?, 'INVITED', ?)`,
      [id, userId, companyId, memberRole, req.userId ?? null]
    );

    await createAuditLog({
      userId: req.userId,
      companyId,
      action: 'COMPANY_MEMBER_INVITED',
      resourceType: 'company_member',
      resourceId: id,
      metadata: { invitedUserId: userId, role: memberRole },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ id, companyId, userId, role: memberRole, status: 'INVITED' });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'User is already a member of this company' });
    }
    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({ error: 'That user does not exist' });
    }
    logger.error('Invite member error:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

router.put('/:id/role', authMiddleware, validateRequest(memberRoleUpdateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const nextRole = String(req.body.role || '').toUpperCase();
    if (!ALLOWED_ROLES.has(nextRole)) {
      return res.status(400).json({ error: 'Invalid role. Use OWNER, ADMIN, FINANCE, LEGAL, OPS, or VIEWER.' });
    }

    const [found] = await pool.query('SELECT * FROM company_members WHERE id = ?', [req.params.id]);
    const existing = (found as any[])[0];
    // Same answer whether it does not exist or belongs to a company the caller cannot manage.
    const standing = existing ? await callerStanding(req, existing.companyId) : null;
    if (!existing || !canManage(standing)) return res.status(404).json({ error: 'Member not found' });

    if (existing.userId === req.userId && standing !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ error: 'You cannot change your own role' });
    }
    // Owners are only created or changed by owners (or the platform), so an admin cannot take over a company.
    if ((nextRole === 'OWNER' || existing.role === 'OWNER') && standing === 'ADMIN') {
      return res.status(403).json({ error: 'Only an owner can change owner roles' });
    }

    // Activating an invited member is the company's decision, made here by an owner or admin.
    await pool.query("UPDATE company_members SET role = ?, status = 'ACTIVE' WHERE id = ?", [nextRole, req.params.id]);
    const [rows] = await pool.query('SELECT * FROM company_members WHERE id = ?', [req.params.id]);
    const member = (rows as any[])[0];

    await createAuditLog({
      userId: req.userId,
      companyId: member.companyId,
      action: 'COMPANY_MEMBER_ROLE_UPDATED',
      resourceType: 'company_member',
      resourceId: req.params.id,
      metadata: { role: nextRole, previousRole: existing.role },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(member);
  } catch (error) {
    logger.error('Update member role error:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

export default router;
