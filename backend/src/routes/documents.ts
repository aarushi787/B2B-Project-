// Purpose: This module (backend/src/routes/documents.ts) is used to implement document upload and signature APIs in a modular, maintainable way.
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';
import { documentSignSchema, documentUploadSchema, validateRequest } from '../middleware/validation.js';
import { resolveStoragePath } from '../services/storage.js';
import { requireCompanyRole } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/', authMiddleware, requireCompanyRole(['OWNER', 'ADMIN', 'LEGAL']), async (req: AuthRequest, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT * FROM documents
       WHERE companyId = ? OR companyId IS NULL
       ORDER BY createdAt DESC`,
      [req.companyId ?? null]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    logger.error('List documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.post('/upload', authMiddleware, requireCompanyRole(['OWNER', 'ADMIN', 'LEGAL']), validateRequest(documentUploadSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { dealId, fileName, filePath, mimeType, sizeBytes, docType, companyId } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const storagePath = resolveStoragePath({ fileName, filePath, docType });

    const id = uuidv4();
    const effectiveCompanyId = companyId ?? req.companyId ?? null;
    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO documents (id, dealId, companyId, uploadedBy, fileName, filePath, mimeType, sizeBytes, docType, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'UPLOADED')`,
      [
        id,
        dealId ?? null,
        effectiveCompanyId,
        req.userId ?? null,
        fileName,
        storagePath,
        mimeType ?? null,
        sizeBytes ?? null,
        docType ?? 'GENERAL',
      ]
    );
    connection.release();

    await createAuditLog({
      userId: req.userId,
      companyId: effectiveCompanyId ?? undefined,
      action: 'DOCUMENT_UPLOADED',
      resourceType: 'document',
      resourceId: id,
      metadata: { fileName, storagePath, docType: docType ?? 'GENERAL', dealId: dealId ?? null },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({ id, status: 'UPLOADED' });
  } catch (error) {
    logger.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

router.post('/presigned-url', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, mimeType, docType } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }
    const { resolveStoragePath, getPresignedUploadUrl } = await import('../services/storage.js');
    const storageKey = resolveStoragePath({ fileName, docType });
    const uploadUrl = await getPresignedUploadUrl(storageKey, mimeType || 'application/octet-stream');

    res.json({
      storageKey,
      uploadUrl,
      publicUrl: process.env.R2_PUBLIC_URL ? `${process.env.R2_PUBLIC_URL}/${storageKey}` : null,
    });
  } catch (error: any) {
    logger.error('Presigned URL error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate presigned upload URL' });
  }
});


router.post('/:id/sign', authMiddleware, requireCompanyRole(['OWNER', 'ADMIN', 'LEGAL']), validateRequest(documentSignSchema), async (req: AuthRequest, res: Response) => {
  try {
    const signatureType = String(req.body.signatureType || 'CLICK').toUpperCase();
    if (!['CLICK', 'OTP', 'DIGITAL'].includes(signatureType)) {
      return res.status(400).json({ error: 'Invalid signatureType. Use CLICK, OTP or DIGITAL.' });
    }

    const signatureId = uuidv4();
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    const document = (rows as any[])[0];
    if (!document) {
      connection.release();
      return res.status(404).json({ error: 'Document not found' });
    }

    await connection.query(
      `INSERT INTO document_signatures (id, documentId, userId, companyId, signatureType, ipAddress)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [signatureId, req.params.id, req.userId ?? null, req.companyId ?? null, signatureType, req.ip ?? null]
    );

    await connection.query('UPDATE documents SET status = "SIGNED" WHERE id = ?', [req.params.id]);
    connection.release();

    await createAuditLog({
      userId: req.userId,
      companyId: req.companyId,
      action: 'DOCUMENT_SIGNED',
      resourceType: 'document',
      resourceId: req.params.id,
      metadata: { signatureType },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ id: req.params.id, signatureId, status: 'SIGNED' });
  } catch (error) {
    logger.error('Sign document error:', error);
    res.status(500).json({ error: 'Failed to sign document' });
  }
});

router.get('/:id/signatures', authMiddleware, requireCompanyRole(['LEGAL']), async (req: AuthRequest, res: Response) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, documentId, userId, companyId, signatureType, ipAddress, signedAt
       FROM document_signatures
       WHERE documentId = ?
       ORDER BY signedAt ASC`,
      [req.params.id]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    logger.error('List signatures error:', error);
    res.status(500).json({ error: 'Failed to fetch signatures' });
  }
});

export default router;


