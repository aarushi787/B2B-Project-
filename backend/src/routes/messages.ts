// Purpose: This module (backend/src/routes/messages.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { emptyBodySchema, messageSendSchema, validateRequest } from '../middleware/validation.js';
import { emitToCompany, emitToDeal } from '../realtime/socket.js';
import { logger } from '../utils/logger.js';
import { withIdempotency } from '../middleware/idempotency.js';

const router = Router();

function mapMessage(row: any) {
  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    dealId: row.dealId ?? undefined,
    content: row.content,
    timestamp: row.createdAt,
    type: 'text',
  };
}

// Get all messages
router.get('/', async (_req: Request, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM messages WHERE deletedAt IS NULL ORDER BY createdAt DESC');
    res.json((rows as any[]).map(mapMessage));
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  } finally {
    if (connection) connection.release();
  }
});

// Get messages by company
router.get('/company/:companyId', async (req: Request, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM messages WHERE deletedAt IS NULL AND (senderId = ? OR receiverId = ?) ORDER BY createdAt DESC',
      [req.params.companyId, req.params.companyId]
    );
    res.json((rows as any[]).map(mapMessage));
  } catch (error) {
    logger.error('Get company messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  } finally {
    if (connection) connection.release();
  }
});

// Get message thread between two users
router.get('/thread', async (req: Request, res: Response) => {
  let connection;
  try {
    const { sender, receiver } = req.query;

    if (!sender || !receiver) {
      return res.status(400).json({ error: 'Sender and receiver IDs are required' });
    }

    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `(SELECT * FROM messages WHERE deletedAt IS NULL AND senderId = ? AND receiverId = ?)
       UNION
       (SELECT * FROM messages WHERE deletedAt IS NULL AND senderId = ? AND receiverId = ?)
       ORDER BY createdAt DESC`,
      [sender, receiver, receiver, sender]
    );
    res.json((rows as any[]).map(mapMessage));
  } catch (error) {
    logger.error('Get message thread error:', error);
    res.status(500).json({ error: 'Failed to fetch message thread' });
  } finally {
    if (connection) connection.release();
  }
});

// Get deal messages
router.get('/deal/:dealId', async (req: Request, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM messages WHERE deletedAt IS NULL AND dealId = ? ORDER BY createdAt DESC', [req.params.dealId]);
    res.json((rows as any[]).map(mapMessage));
  } catch (error) {
    logger.error('Get deal messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  } finally {
    if (connection) connection.release();
  }
});

// Send message
router.post(
  '/send',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(messageSendSchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    const { senderId, receiverId, dealId, content } = req.body;

    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ error: 'Sender ID, receiver ID, and content are required' });
    }

    connection = await pool.getConnection();
    const messageId = uuidv4();

    await connection.beginTransaction();
    await connection.query(
      'INSERT INTO messages (id, senderId, receiverId, dealId, content) VALUES (?, ?, ?, ?, ?)',
      [messageId, senderId, receiverId, dealId ?? null, content]
    );

    const [rows] = await connection.query('SELECT * FROM messages WHERE id = ?', [messageId]);
    await connection.commit();
    const message = mapMessage((rows as any[])[0]);

    emitToCompany(senderId, 'messages:new', message);
    emitToCompany(receiverId, 'messages:new', message);
    if (message.dealId) {
      emitToDeal(message.dealId, 'messages:new', message);
    }

    res.status(201).json(message);
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // no-op
      }
    }
    logger.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  } finally {
    if (connection) connection.release();
  }
  }
);

// Mark message as read
router.put(
  '/:id/read',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(emptyBodySchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('UPDATE messages SET isRead = TRUE WHERE id = ? AND deletedAt IS NULL', [req.params.id]);
    const [rows] = await connection.query('SELECT * FROM messages WHERE id = ? AND deletedAt IS NULL', [req.params.id]);

    if ((rows as any[]).length === 0) return res.status(404).json({ error: 'Message not found' });
    const message = mapMessage((rows as any[])[0]);
    emitToCompany(message.senderId, 'messages:read', { id: message.id, dealId: message.dealId });
    emitToCompany(message.receiverId, 'messages:read', { id: message.id, dealId: message.dealId });
    if (message.dealId) {
      emitToDeal(message.dealId, 'messages:read', { id: message.id });
    }
    res.json(message);
  } catch (error) {
    logger.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  } finally {
    if (connection) connection.release();
  }
  }
);

// Delete message
router.delete(
  '/:id',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('UPDATE messages SET deletedAt = CURRENT_TIMESTAMP WHERE id = ? AND deletedAt IS NULL', [req.params.id]);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    logger.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  } finally {
    if (connection) connection.release();
  }
  }
);

export default router;
