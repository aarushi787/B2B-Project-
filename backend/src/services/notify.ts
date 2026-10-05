// Purpose: one place that creates in-app notifications and live activity events.
// - notifyCompany / notifyUser: stored in `notifications` and pushed over the websocket as 'notifications:new'.
// - notifyAdmins: same, for every platform admin, plus an 'admin:activity' event so open admin screens update live.
// Notification failures are logged and never break the action that triggered them.
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { emitToAdmins, emitToCompany, emitToUser } from '../realtime/socket.js';
import { createAuditLog } from '../utils/audit.js';
import { logger } from '../utils/logger.js';
import { sendNotificationEmail } from './email.js';
import { frontendBaseUrl } from '../utils/origins.js';

export type NotificationType = 'info' | 'success' | 'warning';

type Content = { type?: NotificationType; kind: string; title: string; message: string; link?: string };

// Events worth an email (people are not watching the app all day). PROPOSAL_SENT is the sender's own receipt, so skipped.
const EMAIL_KINDS = /^(PROPOSAL_(?!SENT)|DOCUMENT_(VERIFIED|REJECTED)|COMPANY_VERIFIED|COMPANY_VERIFICATION_REVOKED|DEAL_CREATED|AGREEMENT_|MILESTONE_(SUBMITTED|APPROVED|CHANGES_REQUESTED))/;
const emailsOn = () => process.env.EMAIL_NOTIFICATIONS !== 'false';

async function companyEmails(companyId: string): Promise<string[]> {
  const [rows] = await pool.query(
    `SELECT u.email FROM users u JOIN companies c ON c.userId = u.id WHERE c.id = ? AND u.emailNotifications = TRUE
     UNION
     SELECT u.email FROM users u JOIN company_members m ON m.userId = u.id
      WHERE m.companyId = ? AND m.status = 'ACTIVE' AND m.role IN ('OWNER', 'ADMIN') AND u.emailNotifications = TRUE`,
    [companyId, companyId]
  );
  return (rows as { email: string }[]).map((r) => r.email).filter(Boolean);
}

async function userEmail(userId: string): Promise<string[]> {
  const [rows] = await pool.query('SELECT email FROM users WHERE id = ? AND emailNotifications = TRUE', [userId]);
  return (rows as { email: string }[]).map((r) => r.email).filter(Boolean);
}

/** Fire-and-forget: a failed email must never break the action, and the in-app notification is already stored. */
async function emailRecipients(emails: string[], c: Content): Promise<void> {
  if (!emailsOn() || !EMAIL_KINDS.test(c.kind)) return;
  const link = c.link ? `${frontendBaseUrl()}${c.link.startsWith('/') ? '' : '/'}${c.link}` : undefined;
  await Promise.all(
    [...new Set(emails)].map((to) => sendNotificationEmail(to, c.title, c.message, link, 'Open in B2BForCorporates').catch((e) => logger.error('notification_email_failed', e)))
  );
}

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
    void companyEmails(companyId).then((emails) => emailRecipients(emails, c)).catch((e) => logger.error('notifyCompany email failed', e));
  } catch (error) {
    logger.error('notifyCompany failed', error);
  }
}

export async function notifyUser(userId: string | null | undefined, c: Content): Promise<void> {
  if (!userId) return;
  try {
    const n = await insert(userId, null, c);
    emitToUser(userId, 'notifications:new', n);
    void userEmail(userId).then((emails) => emailRecipients(emails, c)).catch((e) => logger.error('notifyUser email failed', e));
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
