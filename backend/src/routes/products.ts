// Purpose: This module (backend/src/routes/products.ts) is used to implement project functionality in a modular, maintainable way.
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { validateRequest, productCreateSchema, productInventoryUpdateSchema, productUpdateSchema } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';
import { withIdempotency } from '../middleware/idempotency.js';

const router = Router();

// Get all products
router.get('/', async (_req: Request, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [products] = await connection.query('SELECT * FROM products WHERE deletedAt IS NULL');
    res.json(products);
  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  } finally {
    if (connection) connection.release();
  }
});

// Get products by merchant (must be before /:id)
router.get('/merchant/:merchantId', async (req: Request, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [products] = await connection.query('SELECT * FROM products WHERE deletedAt IS NULL AND merchantId = ?', [req.params.merchantId]);
    res.json(products);
  } catch (error) {
    logger.error('Get merchant products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  } finally {
    if (connection) connection.release();
  }
});

// Search products (must be before /:id)
router.get('/search', async (req: Request, res: Response) => {
  let connection;
  try {
    const { q = '' } = req.query as { q?: string };
    connection = await pool.getConnection();
    const [products] = await connection.query(
      'SELECT * FROM products WHERE deletedAt IS NULL AND (name LIKE ? OR description LIKE ?)',
      [`%${q}%`, `%${q}%`]
    );
    res.json(products);
  } catch (error) {
    logger.error('Search products error:', error);
    res.status(500).json({ error: 'Failed to search products' });
  } finally {
    if (connection) connection.release();
  }
});

// Get products by category (must be before /:id)
router.get('/category/:category', async (req: Request, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [products] = await connection.query('SELECT * FROM products WHERE deletedAt IS NULL AND category = ?', [req.params.category]);
    res.json(products);
  } catch (error) {
    logger.error('Get products by category error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  } finally {
    if (connection) connection.release();
  }
});

// Get product by ID
router.get('/:id', async (req: Request, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [products] = await connection.query('SELECT * FROM products WHERE id = ? AND deletedAt IS NULL', [req.params.id]);

    if ((products as any[]).length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json((products as any[])[0]);
  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  } finally {
    if (connection) connection.release();
  }
});

// Create product
router.post(
  '/',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(productCreateSchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    const { name, description, price, category, inventory, merchantId } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Products are listed by the caller's own company; a client-supplied merchantId is only honoured for platform admins.
    const owner = req.role === 'admin' ? (merchantId ?? req.companyId) : req.companyId;
    if (!owner) {
      return res.status(400).json({ error: 'Your account needs a company before you can list products' });
    }
    if (merchantId && merchantId !== owner) {
      return res.status(403).json({ error: 'You can only list products for your own company' });
    }

    connection = await pool.getConnection();
    const productId = uuidv4();

    await connection.query(
      'INSERT INTO products (id, name, description, price, category, inventory, merchantId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [productId, name, description ?? null, price, category ?? null, inventory ?? 0, owner]
    );

    const [rows] = await connection.query('SELECT * FROM products WHERE id = ?', [productId]);
    res.status(201).json((rows as any[])[0]);
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  } finally {
    if (connection) connection.release();
  }
  }
);

// Update product
router.put(
  '/:id',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(productUpdateSchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    const { name, description, price, category, inventory } = req.body;
    connection = await pool.getConnection();

    await connection.query(
      `UPDATE products
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           category = COALESCE(?, category),
           inventory = COALESCE(?, inventory)
       WHERE id = ? AND deletedAt IS NULL AND (? = 1 OR merchantId = ?)`,
      [name ?? null, description ?? null, price ?? null, category ?? null, inventory ?? null, req.params.id, req.role === 'admin' ? 1 : 0, req.companyId ?? null]
    );

    const [rows] = await connection.query('SELECT * FROM products WHERE id = ? AND deletedAt IS NULL AND (? = 1 OR merchantId = ?)', [req.params.id, req.role === 'admin' ? 1 : 0, req.companyId ?? null]);

    // Same answer for "not found" and "not yours".
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json((rows as any[])[0]);
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  } finally {
    if (connection) connection.release();
  }
  }
);

// Delete product
router.delete(
  '/:id',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [result] = await connection.query(
      'UPDATE products SET deletedAt = CURRENT_TIMESTAMP WHERE id = ? AND deletedAt IS NULL AND (? = 1 OR merchantId = ?)',
      [req.params.id, req.role === 'admin' ? 1 : 0, req.companyId ?? null]
    );
    if ((result as { affectedRows: number }).affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  } finally {
    if (connection) connection.release();
  }
  }
);

// Update inventory
router.put(
  '/:id/inventory',
  authMiddleware,
  withIdempotency({ required: false, ttlHours: 24 }),
  validateRequest(productInventoryUpdateSchema),
  async (req: AuthRequest, res: Response) => {
  let connection;
  try {
    const { inventory } = req.body;

    if (inventory === undefined || inventory === null) {
      return res.status(400).json({ error: 'inventory is required' });
    }

    connection = await pool.getConnection();
    await connection.query('UPDATE products SET inventory = ? WHERE id = ? AND deletedAt IS NULL AND (? = 1 OR merchantId = ?)', [inventory, req.params.id, req.role === 'admin' ? 1 : 0, req.companyId ?? null]);
    const [rows] = await connection.query('SELECT * FROM products WHERE id = ? AND deletedAt IS NULL AND (? = 1 OR merchantId = ?)', [req.params.id, req.role === 'admin' ? 1 : 0, req.companyId ?? null]);

    if ((rows as any[]).length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json((rows as any[])[0]);
  } catch (error) {
    logger.error('Update inventory error:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  } finally {
    if (connection) connection.release();
  }
  }
);

export default router;
