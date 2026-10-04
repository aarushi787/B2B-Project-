// Purpose: This module (backend/src/middleware/validation.ts) is used to implement project functionality in a modular, maintainable way.
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { errorResponse } from '../utils/http.js';

const uuidSchema = z.string().uuid('Invalid UUID');
const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format');
const gstSchema = z.string().min(1, 'Invalid GST format');
const panSchema = z.string().min(1, 'Invalid PAN format');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const parseNumber = (value: unknown) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
};

const numericField = () => z.preprocess(parseNumber, z.number().finite());
const positiveNumberField = () => z.preprocess(parseNumber, z.number().finite().positive('Must be positive'));
const nonNegativeNumberField = () => z.preprocess(parseNumber, z.number().finite().nonnegative('Must be zero or positive'));
const integerField = () => z.preprocess(parseNumber, z.number().int());
const nonNegativeIntegerField = () => z.preprocess(parseNumber, z.number().int().min(0, 'Cannot be negative'));
const positiveIntegerField = () => z.preprocess(parseNumber, z.number().int().positive('Must be positive'));
const booleanField = z.preprocess((value) => {
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return value;
}, z.boolean());

const jsonRecordSchema = z.record(z.string(), z.unknown());

// User/Auth schemas
export const userRegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(200),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: phoneSchema,
  companyName: z.string().min(1, 'Company name is required').max(255),
  companyId: uuidSchema.optional(),
  gstNumber: gstSchema.optional(),
  panNumber: panSchema.optional(),
  industry: z.string().max(100).optional(),
  companyDomain: z.string().max(255).optional(),
  website: z.string().url('Invalid website URL').optional(),
  address: z.string().max(1000).optional(),
  description: z.string().max(2000).optional(),
});

export const userLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password required'),
});

export const userProfileUpdateSchema = z
  .object({
    firstName: z.string().min(1, 'First name required').max(100).optional(),
    lastName: z.string().min(1, 'Last name required').max(100).optional(),
    name: z.string().min(1).max(200).optional(),
  })
  .refine((value) => value.firstName || value.lastName || value.name, {
    message: 'At least one profile field is required',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).optional(),
    oldPassword: z.string().min(1).optional(),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword || value.oldPassword, {
    message: 'currentPassword or oldPassword is required',
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20, 'Invalid refresh token format').optional(),
});

// Company schemas
export const companyCreateSchema = z.object({
  name: z.string().min(1, 'Company name required').max(255),
  email: z.string().email('Invalid email format'),
  gst: gstSchema.optional(),
  pan: panSchema.optional(),
  phone: phoneSchema.optional(),
  address: z.string().max(1000).optional(),
  website: z.string().url('Invalid website URL').optional(),
  domain: z.string().max(255).optional(),
  industry: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

export const companyUpdateSchema = companyCreateSchema.partial();

// Product schemas
export const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name required').max(255),
  description: z.string().max(2000).optional(),
  price: positiveNumberField(),
  category: z.string().max(100).optional(),
  inventory: nonNegativeIntegerField().optional(),
  merchantId: uuidSchema,
});

export const productUpdateSchema = productCreateSchema
  .omit({ merchantId: true })
  .partial();

export const productInventoryUpdateSchema = z.object({
  inventory: nonNegativeIntegerField(),
});

// Deal schemas
export const dealCreateSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
    buyerId: uuidSchema,
    sellerId: uuidSchema.optional(),
    sellerIds: z.array(uuidSchema).min(1).optional(),
    productId: uuidSchema.optional(),
    quantity: positiveIntegerField().optional(),
    totalAmount: nonNegativeNumberField().optional(),
    amount: nonNegativeNumberField().optional(),
    status: z.string().max(50).optional(),
  })
  .refine((value) => value.sellerId || (value.sellerIds && value.sellerIds.length > 0), {
    message: 'sellerId or sellerIds[0] is required',
  });

export const dealUpdateSchema = z.object({
  title: z.string().min(1, 'Deal title required').max(255).optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  quantity: positiveIntegerField().optional(),
  totalAmount: nonNegativeNumberField().optional(),
  amount: nonNegativeNumberField().optional(),
  status: z.string().max(50).optional(),
});

export const dealStatusUpdateSchema = z.object({
  status: z.string().min(1).max(50),
});

// Message schemas
export const messageSendSchema = z.object({
  senderId: uuidSchema,
  receiverId: uuidSchema,
  dealId: uuidSchema.optional(),
  content: z.string().min(1, 'Message content required').max(5000),
});

// Payment/Escrow schemas
export const escrowCreateSchema = z.object({
  dealId: uuidSchema,
  payerCompanyId: uuidSchema,
  payeeCompanyId: uuidSchema,
  amount: positiveNumberField(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  paymentProvider: z.string().max(100).optional(),
});

export const paymentIntentCreateSchema = z.object({
  escrowId: uuidSchema.optional(),
  dealId: uuidSchema.optional(),
  payerCompanyId: uuidSchema.optional(),
  payeeCompanyId: uuidSchema.optional(),
  amount: positiveNumberField().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  idempotencyKey: z.string().min(8).max(128).optional(),
  metadata: jsonRecordSchema.optional(),
});

export const emptyBodySchema = z.object({}).passthrough();

// Notification schemas
export const notificationCreateSchema = z.object({
  userId: uuidSchema.optional(),
  companyId: uuidSchema.optional(),
  type: z.string().min(1, 'Type required').max(60).optional(),
  title: z.string().min(1, 'Title required').max(255).optional(),
  message: z.string().min(1, 'Message required').max(4000).optional(),
  payload: jsonRecordSchema.optional(),
});

// Document schemas
export const documentUploadSchema = z.object({
  dealId: uuidSchema.optional(),
  companyId: uuidSchema.optional(),
  fileName: z.string().min(1, 'File name required').max(255),
  filePath: z.string().max(2000).optional(),
  mimeType: z.string().max(120).optional(),
  sizeBytes: nonNegativeIntegerField().optional(),
  docType: z.string().min(1, 'Document type required').max(80).optional(),
});

export const documentSignSchema = z.object({
  signatureType: z.enum(['CLICK', 'OTP', 'DIGITAL']).optional(),
});

// Reputation schemas
export const reputationEventSchema = z.object({
  companyId: uuidSchema,
  counterpartyCompanyId: uuidSchema.optional(),
  dealId: uuidSchema.optional(),
  score: z.preprocess(parseNumber, z.number().int().min(1).max(5, 'Score must be 1-5')),
  comment: z.string().max(1000).optional(),
});

// KYC schemas
export const kycUploadSchema = z.object({
  companyId: uuidSchema,
  documentType: z.string().min(1, 'Document type required').max(80),
  fileName: z.string().min(1, 'File name required').max(255),
  filePath: z.string().max(2000).optional(),
  mimeType: z.string().max(120).optional(),
  sizeBytes: nonNegativeIntegerField().optional(),
});

export const kycVerifySchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']).optional(),
});

// Privacy/GDPR schemas
export const consentRecordSchema = z.object({
  purpose: z.string().min(1, 'Purpose required').max(120),
  granted: booleanField,
  source: z.string().max(120).optional(),
});

export const deleteRequestSchema = z.object({
  reason: z.string().max(2000).optional(),
});

// Job schemas
export const jobCreateSchema = z.object({
  type: z.string().min(1, 'Job type required').max(100),
  payload: z.unknown().optional(),
  runAt: z.string().datetime().nullable().optional(),
});

export const jobStatusUpdateSchema = z.object({
  status: z.enum(['processing', 'completed', 'failed', 'dead_letter']),
  lastError: z.string().max(4000).optional(),
});

// Member schemas
export const memberInviteSchema = z.object({
  companyId: uuidSchema,
  userId: uuidSchema,
  role: z.enum(['OWNER', 'ADMIN', 'FINANCE', 'LEGAL', 'OPS', 'VIEWER']).optional(),
});

export const memberRoleUpdateSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'FINANCE', 'LEGAL', 'OPS', 'VIEWER']),
});

// Compliance schemas
export const gstVerifySchema = z.object({
  gstNumber: gstSchema,
});

export const panVerifySchema = z.object({
  panNumber: panSchema,
});

// Admin schemas
export const adminCreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: passwordSchema,
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: phoneSchema.optional(),
  role: z.enum(['user', 'admin', 'buyer', 'seller']).optional(), // buyer/seller accepted as legacy aliases of 'user'
});

export const adminUpdateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: phoneSchema.optional(),
  role: z.enum(['user', 'admin', 'buyer', 'seller']).optional(), // buyer/seller accepted as legacy aliases of 'user'
  password: passwordSchema.optional(),
});

// Ledger schema
export const ledgerCreateSchema = z.object({
  companyId: uuidSchema,
  dealId: uuidSchema.optional(),
  amount: numericField(),
  type: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
  counterparty: z.string().max(255).optional(),
});

function zodErrorResponse(res: Response, message: string, error: z.ZodError) {
  return errorResponse(
    res,
    400,
    'VALIDATION_ERROR',
    message,
    error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }))
  );
}

export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body) as Request['body'];
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return zodErrorResponse(res, 'Validation failed', error);
      }
      return errorResponse(res, 400, 'BAD_REQUEST', 'Invalid request data');
    }
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      (req as unknown as { query: unknown }).query = schema.parse(req.query);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return zodErrorResponse(res, 'Query validation failed', error);
      }
      return errorResponse(res, 400, 'BAD_REQUEST', 'Invalid query parameters');
    }
  };
}
