// Purpose: This module (backend/src/routes/notifications.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { adminMiddleware, authMiddleware, AuthRequest } from '../middleware/auth.js';
import { emptyBodySchema, notificationCreateSchema, validateRequest } from '../middleware/validation.js';
import { emitToCompany, emitToUser } from '../realtime/socket.js';
import { logger } from '../utils/logger.js';
import { withIdempotency } from '../middleware/idempotency.js';

const router = Router();

type SseClient = { id: string; userId?: string; companyId?: string; res: Response };
const sseClients = new Map<string, SseClient>();

function broadcastNotification(notification: any): void {
  const transport = (process.env.REALTIME_NOTIFICATIONS_TRANSPORT || 'socket').toLowerCase();

  if (transport === 'sse' || transport === 'both') {
    const data = `data: ${JSON.stringify(notification)}\n\n`;
    for (const client of sseClients.values()) {
      const matchesUser = !client.userId || client.userId === notification.userId;
      const matchesCompany = !client.companyId || client.companyId === notification.companyId;
      if (matchesUser && matchesCompany) {
        client.res.write(data);
      }
    }
  }

  if (transport === 'socket' || transport === 'both') {
    emitToUser(notification.userId, 'notifications:new', notification);
    emitToCompany(notification.companyId, 'notifications:new', notification);
  }
}

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const connection = pool;
    const [rows] = await connection.query(
      `SELECT id, userId, companyId, type, title, message, payload, isRead, createdAt
       FROM notifications
       WHERE userId = ? OR (userId IS NULL AND companyId = ?)
       ORDER BY createdAt DESC
       LIMIT 100`,
      [req.userId ?? null, req.companyId ?? null]
    );
    res.json((rows as any[]).map((r) => ({ ...r, payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload, isRead: !!r.isRead })));
  } catch (error) {
    logger.error('List notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.get('/stream', authMiddleware, (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const id = uuidv4();
  sseClients.set(id, { id, userId: req.userId, companyId: req.companyId, res });
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', id })}\n\n`);

  req.on('close', () => {
    sseClients.delete(id);
  });
});

// Creating arbitrary notifications for other users is an admin tool; the app itself uses services/notify.ts.
router.post(
  '/',
  adminMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(notificationCreateSchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body.payload ?? null;
    const notification = {
      id: uuidv4(),
      userId: req.body.userId ?? null,
      companyId: req.body.companyId ?? req.companyId ?? null,
      type: String(req.body.type ?? 'GENERAL'),
      title: String(req.body.title ?? 'Notification'),
      message: String(req.body.message ?? ''),
      payload: payload ? JSON.stringify(payload) : null,
      isRead: false,
    };

    const connection = pool;
    await connection.query(
      `INSERT INTO notifications (id, userId, companyId, type, title, message, payload, isRead)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notification.id,
        notification.userId,
        notification.companyId,
        notification.type,
        notification.title,
        notification.message,
        notification.payload,
        notification.isRead,
      ]
    );

    broadcastNotification({ ...notification, payload });
    res.status(201).json({ ...notification, payload });
  } catch (error) {
    logger.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
  }
);

router.put('/read-all', authMiddleware, validateRequest(emptyBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    await pool.query(
      'UPDATE notifications SET isRead = TRUE WHERE isRead = FALSE AND (userId = ? OR (userId IS NULL AND companyId = ?))',
      [req.userId ?? null, req.companyId ?? null]
    );
    res.json({ ok: true });
  } catch (error) {
    logger.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

router.put(
  '/:id/read',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(emptyBodySchema),
  async (req: AuthRequest, res: Response) => {
  try {
    const connection = pool;
    await connection.query(
      'UPDATE notifications SET isRead = TRUE WHERE id = ? AND (userId = ? OR (userId IS NULL AND companyId = ?))',
      [req.params.id, req.userId ?? null, req.companyId ?? null]
    );
    emitToUser(req.userId, 'notifications:read', { id: req.params.id, isRead: true });
    emitToCompany(req.companyId, 'notifications:read', { id: req.params.id, isRead: true });
    res.json({ id: req.params.id, isRead: true });
  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
  }
);

export default router;


