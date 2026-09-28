// Purpose: This module (backend/src/routes/members.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';
import { memberInviteSchema, memberRoleUpdateSchema, validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

const router = Router();

const ALLOWED_ROLES = new Set(['OWNER', 'ADMIN', 'FINANCE', 'LEGAL', 'OPS', 'VIEWER']);

router.get('/company/:companyId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT cm.id, cm.userId, cm.companyId, cm.role, cm.status, cm.invitedBy, cm.createdAt, cm.updatedAt, u.email, u.firstName, u.lastName
       FROM company_members cm
       INNER JOIN users u ON u.id = cm.userId
       WHERE cm.companyId = ?
       ORDER BY cm.createdAt DESC`,
      [req.params.companyId]
    );
    connection.release();
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

    const id = uuidv4();
    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO company_members (id, userId, companyId, role, status, invitedBy)
       VALUES (?, ?, ?, ?, 'INVITED', ?)`,
      [id, userId, companyId, memberRole, req.userId ?? null]
    );
    connection.release();

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

    const connection = await pool.getConnection();
    await connection.query('UPDATE company_members SET role = ?, status = "ACTIVE" WHERE id = ?', [nextRole, req.params.id]);
    const [rows] = await connection.query('SELECT * FROM company_members WHERE id = ?', [req.params.id]);
    connection.release();

    const member = (rows as any[])[0];
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await createAuditLog({
      userId: req.userId,
      companyId: member.companyId,
      action: 'COMPANY_MEMBER_ROLE_UPDATED',
      resourceType: 'company_member',
      resourceId: req.params.id,
      metadata: { role: nextRole },
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


