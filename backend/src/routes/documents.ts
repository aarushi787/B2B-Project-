// Purpose: This module (backend/src/routes/documents.ts) is used to implement document upload and signature APIs in a modular, maintainable way.
import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../utils/audit.js';
import { agreementCreateSchema, documentSignSchema, documentUploadSchema, validateRequest } from '../middleware/validation.js';
import { resolveStoragePath } from '../services/storage.js';
import { requireCompanyRole } from '../middleware/rbac.js';
import { logger } from '../utils/logger.js';
import { buildAgreementText, hashContent } from '../services/agreements.js';
import { notifyCompany } from '../services/notify.js';
import { emitToCompany } from '../realtime/socket.js';

const router = Router();

const ALLOWED_UPLOAD_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

async function isDealParty(connection: any, dealId: string, companyId: string): Promise<boolean> {
  const [rows] = await connection.query(
    'SELECT id FROM deals WHERE id = ? AND deletedAt IS NULL AND (buyerId = ? OR sellerId = ?) LIMIT 1',
    [dealId, companyId, companyId]
  );
  return (rows as any[]).length > 0;
}

/** A document belongs to its company, or (for deal documents) to either party of the deal. Platform admins see all. */
async function canAccessDocument(connection: any, document: any, req: AuthRequest): Promise<boolean> {
  if (req.role === 'admin') return true;
  if (!req.companyId) return false;
  if (document.companyId) return document.companyId === req.companyId;
  if (!document.dealId) return false;
  return isDealParty(connection, document.dealId, req.companyId);
}

router.get('/', authMiddleware, requireCompanyRole(['OWNER', 'ADMIN', 'LEGAL']), async (req: AuthRequest, res: Response) => {
  let connection: any;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT * FROM documents
       WHERE companyId = ?
          OR dealId IN (SELECT id FROM deals WHERE (buyerId = ? OR sellerId = ?) AND deletedAt IS NULL)
       ORDER BY createdAt DESC`,
      [req.companyId ?? null, req.companyId ?? null, req.companyId ?? null]
    );
    res.json(rows);
  } catch (error) {
    logger.error('List documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  } finally {
    connection?.release();
  }
});

router.post('/upload', authMiddleware, requireCompanyRole(['OWNER', 'ADMIN', 'LEGAL']), validateRequest(documentUploadSchema), async (req: AuthRequest, res: Response) => {
  let connection: any;
  try {
    const { dealId, fileName, filePath, mimeType, sizeBytes, docType, companyId } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const storagePath = resolveStoragePath({ fileName, filePath, docType });

    const id = uuidv4();
    // Never trust a client-supplied companyId: documents are filed under the caller's own company.
    if (companyId && companyId !== req.companyId && req.role !== 'admin') {
      return res.status(403).json({ error: 'You can only upload documents for your own company' });
    }
    const effectiveCompanyId = (req.role === 'admin' ? companyId : undefined) ?? req.companyId ?? null;
    connection = await pool.getConnection();
    if (dealId && req.role !== 'admin' && !(await isDealParty(connection, dealId, req.companyId ?? ''))) {
      return res.status(403).json({ error: 'You are not a party to this deal' });
    }
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
  } finally {
    connection?.release();
  }
});

// --- E-signed agreements -------------------------------------------------------------------------------------------
// One agreement per deal, generated from the accepted terms. Both the buyer and the seller company must sign; the
// document becomes SIGNED only when both have. Each signature stores the signer's name, time, IP and the text's hash.

async function loadAgreement(connection: any, dealId: string) {
  const [docs] = await connection.query(
    "SELECT * FROM documents WHERE dealId = ? AND docType = 'AGREEMENT' AND deletedAt IS NULL ORDER BY createdAt ASC LIMIT 1",
    [dealId]
  );
  return (docs as any[])[0] ?? null;
}

async function agreementView(connection: any, doc: any, req: AuthRequest) {
  const [deals] = await connection.query(
    `SELECT d.buyerId, d.sellerId, bc.name AS buyerName, sc.name AS sellerName
     FROM deals d JOIN companies bc ON bc.id = d.buyerId JOIN companies sc ON sc.id = d.sellerId WHERE d.id = ?`,
    [doc.dealId]
  );
  const deal = (deals as any[])[0];
  const [sigs] = await connection.query(
    'SELECT companyId, signerName, signedAt, signatureType, contentHash FROM document_signatures WHERE documentId = ? ORDER BY signedAt ASC',
    [doc.id]
  );
  const signatures = sigs as any[];
  const party = (companyId: string, name: string, role: 'buyer' | 'seller') => {
    const sig = signatures.find((x) => x.companyId === companyId);
    return { companyId, name, role, signed: Boolean(sig), signerName: sig?.signerName ?? null, signedAt: sig?.signedAt ?? null };
  };
  const parties = [party(deal.buyerId, deal.buyerName, 'buyer'), party(deal.sellerId, deal.sellerName, 'seller')];
  const mine = parties.find((p) => p.companyId === req.companyId);
  return {
    id: doc.id,
    dealId: doc.dealId,
    status: doc.status,
    content: doc.content,
    contentHash: doc.contentHash,
    createdAt: doc.createdAt,
    parties,
    fullySigned: parties.every((p) => p.signed),
    canSign: Boolean(mine && !mine.signed && doc.status !== 'SIGNED'),
  };
}

// Every agreement on deals this company is a party to, with who has signed. Needs no special company role: it is
// the company's own contracts, so any member can see where they stand.
router.get('/agreements', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.companyId) return res.json([]);
    const [rows] = await pool.query(
      `SELECT doc.id, doc.dealId, doc.status, doc.createdAt, d.title AS dealTitle, d.totalAmount, d.buyerId, d.sellerId,
              bc.name AS buyerName, sc.name AS sellerName,
              (SELECT COUNT(*) FROM document_signatures s WHERE s.documentId = doc.id AND s.companyId = d.buyerId) AS buyerSigned,
              (SELECT COUNT(*) FROM document_signatures s WHERE s.documentId = doc.id AND s.companyId = d.sellerId) AS sellerSigned
       FROM documents doc
       JOIN deals d ON d.id = doc.dealId AND d.deletedAt IS NULL
       JOIN companies bc ON bc.id = d.buyerId
       JOIN companies sc ON sc.id = d.sellerId
       WHERE doc.docType = 'AGREEMENT' AND doc.deletedAt IS NULL AND (d.buyerId = ? OR d.sellerId = ?)
       ORDER BY doc.createdAt DESC LIMIT 200`,
      [req.companyId, req.companyId]
    );
    res.json((rows as any[]).map((r) => {
      const iAmBuyer = r.buyerId === req.companyId;
      return {
        id: r.id, dealId: r.dealId, dealTitle: r.dealTitle, amount: Number(r.totalAmount) || 0, status: r.status, createdAt: r.createdAt,
        counterparty: iAmBuyer ? r.sellerName : r.buyerName, myRole: iAmBuyer ? 'buyer' : 'seller',
        mySigned: Number(iAmBuyer ? r.buyerSigned : r.sellerSigned) > 0, theirSigned: Number(iAmBuyer ? r.sellerSigned : r.buyerSigned) > 0,
      };
    }));
  } catch (error) {
    logger.error('List agreements error:', error);
    res.status(500).json({ error: 'Failed to load your agreements' });
  }
});

router.get('/agreement/:dealId', authMiddleware, async (req: AuthRequest, res: Response) => {
  let connection: any;
  try {
    connection = await pool.getConnection();
    if (req.role !== 'admin' && !(await isDealParty(connection, req.params.dealId, req.companyId ?? ''))) {
      return res.status(404).json({ error: 'Agreement not found' });
    }
    const doc = await loadAgreement(connection, req.params.dealId);
    if (!doc) return res.json(null);
    res.json(await agreementView(connection, doc, req));
  } catch (error) {
    logger.error('Get agreement error:', error);
    res.status(500).json({ error: 'Failed to load the agreement' });
  } finally {
    connection?.release();
  }
});

router.post('/agreements', authMiddleware, requireCompanyRole(['OWNER', 'ADMIN', 'LEGAL']), validateRequest(agreementCreateSchema), async (req: AuthRequest, res: Response) => {
  let connection: any;
  try {
    const { dealId } = req.body as { dealId: string };
    connection = await pool.getConnection();
    if (!(await isDealParty(connection, dealId, req.companyId ?? ''))) {
      return res.status(403).json({ error: 'You are not a party to this deal' });
    }
    const existing = await loadAgreement(connection, dealId);
    if (existing) return res.status(200).json(await agreementView(connection, existing, req));

    const [rows] = await connection.query(
      `SELECT d.id, d.title, d.description, d.totalAmount, d.buyerId, d.sellerId,
              bc.name AS buyerName, bc.gst AS buyerGst, bc.address AS buyerAddress,
              sc.name AS sellerName, sc.gst AS sellerGst, sc.address AS sellerAddress
       FROM deals d JOIN companies bc ON bc.id = d.buyerId JOIN companies sc ON sc.id = d.sellerId
       WHERE d.id = ? AND d.deletedAt IS NULL`,
      [dealId]
    );
    const deal = (rows as any[])[0];
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    // The terms both sides accepted, when the deal came from a proposal.
    const [accepted] = await connection.query(
      `SELECT p.amount, p.currency, p.timeline, p.message, p.deliverables
       FROM requirements r JOIN proposals p ON p.id = r.awardedProposalId WHERE r.dealId = ? LIMIT 1`,
      [dealId]
    );
    const terms = (accepted as any[])[0];
    let deliverables: string[] = [];
    try { const parsed = JSON.parse(terms?.deliverables ?? '[]'); if (Array.isArray(parsed)) deliverables = parsed.map(String); } catch { /* free text */ }

    const content = buildAgreementText({
      dealId,
      title: deal.title,
      description: deal.description,
      buyer: { name: deal.buyerName, gst: deal.buyerGst, address: deal.buyerAddress },
      seller: { name: deal.sellerName, gst: deal.sellerGst, address: deal.sellerAddress },
      amount: Number(terms?.amount ?? deal.totalAmount ?? 0),
      currency: terms?.currency ?? 'INR',
      timeline: terms?.timeline,
      deliverables,
      approach: terms?.message,
      date: new Date(),
    });
    const id = uuidv4();
    await connection.query(
      `INSERT INTO documents (id, dealId, companyId, uploadedBy, fileName, mimeType, sizeBytes, docType, status, content, contentHash)
       VALUES (?, ?, NULL, ?, ?, 'text/plain', ?, 'AGREEMENT', 'UPLOADED', ?, ?)`,
      [id, dealId, req.userId ?? null, `Agreement - ${String(deal.title).slice(0, 200)}.txt`, Buffer.byteLength(content), content, hashContent(content)]
    );
    await createAuditLog({ userId: req.userId, companyId: req.companyId, action: 'AGREEMENT_CREATED', resourceType: 'document', resourceId: id, metadata: { dealId }, ipAddress: req.ip, userAgent: req.get('user-agent') });

    const other = req.companyId === deal.buyerId ? deal.sellerId : deal.buyerId;
    void notifyCompany(other, { kind: 'AGREEMENT_CREATED', type: 'info', title: 'Agreement ready to sign', message: `An agreement for "${deal.title}" is ready for your review and signature.`, link: `/app/deals/${dealId}` });
    emitToCompany(other, 'documents:updated', { dealId });

    const created = await loadAgreement(connection, dealId);
    res.status(201).json(await agreementView(connection, created, req));
  } catch (error) {
    logger.error('Create agreement error:', error);
    res.status(500).json({ error: 'Failed to create the agreement' });
  } finally {
    connection?.release();
  }
});

router.post('/presigned-url', authMiddleware, requireCompanyRole(['OWNER', 'ADMIN', 'LEGAL']), async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, mimeType, docType } = req.body;
    if (!fileName || typeof fileName !== 'string' || fileName.length > 255) {
      return res.status(400).json({ error: 'A valid fileName is required' });
    }
    if (mimeType && !ALLOWED_UPLOAD_TYPES.has(String(mimeType))) {
      return res.status(400).json({ error: 'File type not allowed' });
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
    res.status(500).json({ error: 'Failed to generate presigned upload URL' });
  }
});


router.post('/:id/sign', authMiddleware, requireCompanyRole(['OWNER', 'ADMIN', 'LEGAL']), validateRequest(documentSignSchema), async (req: AuthRequest, res: Response) => {
  let connection: any;
  try {
    const signatureType = String(req.body.signatureType || 'CLICK').toUpperCase();
    if (!['CLICK', 'OTP', 'DIGITAL'].includes(signatureType)) {
      return res.status(400).json({ error: 'Invalid signatureType. Use CLICK, OTP or DIGITAL.' });
    }

    const signatureId = uuidv4();
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM documents WHERE id = ?', [req.params.id]);
    const document = (rows as any[])[0];
    // Same response for "missing" and "not yours", so document ids can't be probed.
    if (!document || !(await canAccessDocument(connection, document, req))) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.docType === 'AGREEMENT') {
      // An agreement needs an explicit "I agree" and a typed name, and each company signs once.
      if (req.body.agree !== true || !req.body.signerName) {
        return res.status(400).json({ error: 'Type your full name and confirm that you agree to sign.' });
      }
      if (!req.companyId) return res.status(403).json({ error: 'Your account is not linked to a company' });
      const [dealRows] = await connection.query('SELECT buyerId, sellerId, title FROM deals WHERE id = ?', [document.dealId]);
      const deal = (dealRows as any[])[0];
      if (!deal || (deal.buyerId !== req.companyId && deal.sellerId !== req.companyId)) {
        return res.status(403).json({ error: 'Only the buyer or seller company can sign this agreement' });
      }
      const [already] = await connection.query('SELECT id FROM document_signatures WHERE documentId = ? AND companyId = ? LIMIT 1', [document.id, req.companyId]);
      if ((already as any[]).length > 0) return res.status(409).json({ error: 'Your company has already signed this agreement' });

      await connection.query(
        `INSERT INTO document_signatures (id, documentId, userId, companyId, signatureType, ipAddress, signerName, contentHash)
         VALUES (?, ?, ?, ?, 'CLICK', ?, ?, ?)`,
        [signatureId, document.id, req.userId ?? null, req.companyId, req.ip ?? null, String(req.body.signerName).trim(), document.contentHash]
      );
      const [signedRows] = await connection.query('SELECT DISTINCT companyId FROM document_signatures WHERE documentId = ?', [document.id]);
      const signedBy = new Set((signedRows as any[]).map((r) => r.companyId));
      const complete = signedBy.has(deal.buyerId) && signedBy.has(deal.sellerId);
      if (complete) await connection.query("UPDATE documents SET status = 'SIGNED' WHERE id = ?", [document.id]);

      await createAuditLog({ userId: req.userId, companyId: req.companyId, action: 'AGREEMENT_SIGNED', resourceType: 'document', resourceId: document.id, metadata: { dealId: document.dealId, complete, contentHash: document.contentHash }, ipAddress: req.ip, userAgent: req.get('user-agent') });

      const other = req.companyId === deal.buyerId ? deal.sellerId : deal.buyerId;
      void notifyCompany(other, {
        kind: complete ? 'AGREEMENT_COMPLETE' : 'AGREEMENT_SIGNED', type: 'success',
        title: complete ? 'Agreement fully signed' : 'The other party signed the agreement',
        message: complete ? `"${deal.title}" is now signed by both parties.` : `Please review and sign the agreement for "${deal.title}".`,
        link: `/app/deals/${document.dealId}`,
      });
      if (complete) void notifyCompany(req.companyId, { kind: 'AGREEMENT_COMPLETE', type: 'success', title: 'Agreement fully signed', message: `"${deal.title}" is now signed by both parties.`, link: `/app/deals/${document.dealId}` });
      emitToCompany(other, 'documents:updated', { dealId: document.dealId });
      emitToCompany(req.companyId, 'documents:updated', { dealId: document.dealId });
      return res.json({ id: document.id, signatureId, status: complete ? 'SIGNED' : 'UPLOADED', fullySigned: complete });
    }

    await connection.query(
      `INSERT INTO document_signatures (id, documentId, userId, companyId, signatureType, ipAddress)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [signatureId, req.params.id, req.userId ?? null, req.companyId ?? null, signatureType, req.ip ?? null]
    );

    await connection.query("UPDATE documents SET status = 'SIGNED' WHERE id = ?", [req.params.id]);

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
  } finally {
    connection?.release();
  }
});

router.get('/:id/signatures', authMiddleware, requireCompanyRole(['LEGAL']), async (req: AuthRequest, res: Response) => {
  let connection: any;
  try {
    connection = await pool.getConnection();
    const [docs] = await connection.query('SELECT id, companyId, dealId FROM documents WHERE id = ?', [req.params.id]);
    const document = (docs as any[])[0];
    if (!document || !(await canAccessDocument(connection, document, req))) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const [rows] = await connection.query(
      `SELECT id, documentId, userId, companyId, signatureType, ipAddress, signedAt
       FROM document_signatures
       WHERE documentId = ?
       ORDER BY signedAt ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    logger.error('List signatures error:', error);
    res.status(500).json({ error: 'Failed to fetch signatures' });
  } finally {
    connection?.release();
  }
});

export default router;


