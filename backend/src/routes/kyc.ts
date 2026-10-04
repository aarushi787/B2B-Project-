// Purpose: This module (backend/src/routes/kyc.ts) is used to implement KYC upload and verification APIs in a modular, maintainable way.
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { adminMiddleware, authMiddleware, AuthRequest } from '../middleware/auth.js';
import { decryptJson, encryptJson } from '../utils/encryption.js';
import { createAuditLog } from '../utils/audit.js';
import { sendNotificationEmail } from '../services/email.js';
import { kycUploadSchema, kycVerifySchema, validateRequest } from '../middleware/validation.js';
import { resolveStoragePath } from '../services/storage.js';
import { notifyAdmins, notifyCompany } from '../services/notify.js';
import { emitToCompany } from '../realtime/socket.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/company/:companyId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.role !== 'admin' && req.params.companyId !== req.companyId) {
      return res.status(403).json({ error: 'You can only see your own company documents' });
    }
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, companyId, uploadedBy, documentType, status, verifierUserId, verifiedAt, createdAt, updatedAt
       FROM kyc_documents
       WHERE companyId = ?
       ORDER BY createdAt DESC`,
      [req.params.companyId]
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    logger.error('List KYC docs error:', error);
    res.status(500).json({ error: 'Failed to fetch KYC documents' });
  }
});

router.post('/upload', authMiddleware, validateRequest(kycUploadSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, documentType, fileName, filePath, mimeType, sizeBytes, contentBase64 } = req.body;
    if (companyId !== req.companyId) {
      return res.status(403).json({ error: 'You can only upload documents for your own company' });
    }
    if (!companyId || !documentType || !fileName) {
      return res.status(400).json({ error: 'companyId, documentType and fileName are required' });
    }

    const storagePath = resolveStoragePath({ fileName, filePath, docType: documentType });

    const id = uuidv4();
    const encryptedMeta = encryptJson({
      fileName,
      filePath: storagePath,
      mimeType: mimeType ?? null,
      sizeBytes: sizeBytes ?? null,
      contentBase64: contentBase64 ?? null,
      uploadedAt: new Date().toISOString(),
    });

    const connection = await pool.getConnection();
    await connection.query(
      `INSERT INTO kyc_documents (id, companyId, uploadedBy, documentType, encryptedMeta, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [id, companyId, req.userId ?? null, String(documentType).toUpperCase(), encryptedMeta]
    );
    connection.release();

    await createAuditLog({
      userId: req.userId,
      companyId,
      action: 'KYC_DOCUMENT_UPLOADED',
      resourceType: 'kyc_document',
      resourceId: id,
      metadata: { documentType: String(documentType).toUpperCase() },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    void notifyAdmins({
      kind: 'DOCUMENT_SUBMITTED', type: 'warning', title: 'Document waiting for approval',
      message: `${fileName} (${String(documentType).toUpperCase()}) needs review.`,
      actorUserId: req.userId, actorCompanyId: companyId, resourceType: 'kyc_document', resourceId: id,
    });
    res.status(201).json({ id, status: 'PENDING' });
  } catch (error: any) {
    if (String(error?.message || '').includes('DATA_ENCRYPTION_KEY')) {
      return res.status(500).json({ error: 'KYC storage encryption is not configured. Set DATA_ENCRYPTION_KEY.' });
    }
    logger.error('Upload KYC doc error:', error);
    res.status(500).json({ error: 'Failed to upload KYC document' });
  }
});

router.put('/:id/verify', adminMiddleware, validateRequest(kycVerifySchema), async (req: AuthRequest, res: Response) => {
  try {
    const status = String(req.body.status || 'VERIFIED').toUpperCase();
    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'status must be VERIFIED or REJECTED' });
    }

    const connection = await pool.getConnection();
    await connection.query(
      `UPDATE kyc_documents
       SET status = ?, verifierUserId = ?, verifiedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, req.userId ?? null, req.params.id]
    );
    const [rows] = await connection.query('SELECT * FROM kyc_documents WHERE id = ?', [req.params.id]);
    connection.release();
    const updated = (rows as any[])[0];
    if (!updated) {
      return res.status(404).json({ error: 'KYC document not found' });
    }

    await createAuditLog({
      userId: req.userId,
      companyId: updated.companyId,
      action: `KYC_DOCUMENT_${status}`,
      resourceType: 'kyc_document',
      resourceId: req.params.id,
      metadata: { status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    const reason = req.body.reason ? ` Reason: ${req.body.reason}` : '';
    void notifyCompany(updated.companyId, {
      kind: `DOCUMENT_${status}`, type: status === 'VERIFIED' ? 'success' : 'warning',
      title: status === 'VERIFIED' ? 'Document approved' : 'Document rejected',
      message: `Your ${updated.documentType} document was ${status === 'VERIFIED' ? 'approved' : 'rejected'}.${reason}`,
      link: '/app/contracts',
    });
    emitToCompany(updated.companyId, 'kyc:updated', { id: updated.id, status });

    // Notify user async
    if (status === 'VERIFIED') {
      sendNotificationEmail(
        'admin@b2bforcorporates.com', // Would normally look up company owner's email
        'KYC Document Verified',
        `Your ${updated.documentType} document has been verified. Your company profile is now one step closer to full approval.`,
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/contracts`,
        'View Verification Progress'
      ).catch(e => logger.error('Email error', e));
    }

    res.json({
      id: updated.id,
      companyId: updated.companyId,
      documentType: updated.documentType,
      status: updated.status,
      verifiedAt: updated.verifiedAt,
    });
  } catch (error) {
    logger.error('Verify KYC doc error:', error);
    res.status(500).json({ error: 'Failed to verify KYC document' });
  }
});

// Admin review: the decrypted file for one document.
router.get('/:id/file', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT encryptedMeta FROM kyc_documents WHERE id = ?', [req.params.id]);
    const row = (rows as any[])[0];
    if (!row) return res.status(404).json({ error: 'Document not found' });
    const meta = decryptJson<{ fileName: string; mimeType: string | null; contentBase64: string | null }>(row.encryptedMeta);
    if (!meta.contentBase64) return res.status(404).json({ error: 'No file content was uploaded with this document' });
    res.setHeader('Content-Type', meta.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(meta.fileName)}"`);
    res.send(Buffer.from(meta.contentBase64, 'base64'));
  } catch (error) {
    logger.error('Download KYC doc error:', error);
    res.status(500).json({ error: 'Failed to read document' });
  }
});

export default router;


