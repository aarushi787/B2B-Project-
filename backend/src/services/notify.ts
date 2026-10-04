// Purpose: one place that creates in-app notifications and live activity events.
// - notifyCompany / notifyUser: stored in `notifications` and pushed over the websocket as 'notifications:new'.
// - notifyAdmins: same, for every platform admin, plus an 'admin:activity' event so open admin screens update live.
// Notification failures are logged and never break the action that triggered them.
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { emitToAdmins, emitToCompany, emitToUser } from '../realtime/socket.js';
import { createAuditLog } from '../utils/audit.js';
import { logger } from '../utils/logger.js';

export type NotificationType = 'info' | 'success' | 'warning';

type Content = { type?: NotificationType; kind: string; title: string; message: string; link?: string };

async function insert(userId: string | null, companyId: string | null, c: Content) {
  const n = {
    id: uuidv4(),
    userId,
    companyId,
    type: c.type ?? 'info',
    title: c.title,
    message: c.message,
    payload: { kind: c.kind, link: c.link ?? null },
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  await pool.query(
    `INSERT INTO notifications (id, userId, companyId, type, title, message, payload, isRead) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)`,
    [n.id, n.userId, n.companyId, n.type, n.title, n.message, JSON.stringify(n.payload)]
  );
  return n;
}

export async function notifyCompany(companyId: string | null | undefined, c: Content): Promise<void> {
  if (!companyId) return;
  try {
    const n = await insert(null, companyId, c);
    emitToCompany(companyId, 'notifications:new', n);
  } catch (error) {
    logger.error('notifyCompany failed', error);
  }
}

export async function notifyUser(userId: string | null | undefined, c: Content): Promise<void> {
  if (!userId) return;
  try {
    const n = await insert(userId, null, c);
    emitToUser(userId, 'notifications:new', n);
  } catch (error) {
    logger.error('notifyUser failed', error);
  }
}

/** Tells every platform admin, records the event in the audit log and refreshes open admin screens. */
export async function notifyAdmins(
  c: Content & { actorUserId?: string; actorCompanyId?: string; resourceType?: string; resourceId?: string }
): Promise<void> {
  try {
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins as { id: string }[]) {
      const n = await insert(admin.id, null, c);
      emitToUser(admin.id, 'notifications:new', n);
    }
    await createAuditLog({
      userId: c.actorUserId,
      companyId: c.actorCompanyId,
      action: c.kind,
      resourceType: c.resourceType,
      resourceId: c.resourceId,
      metadata: { title: c.title, message: c.message },
    });
    emitToAdmins('admin:activity', { kind: c.kind, title: c.title, message: c.message, at: new Date().toISOString() });
  } catch (error) {
    logger.error('notifyAdmins failed', error);
  }
}
