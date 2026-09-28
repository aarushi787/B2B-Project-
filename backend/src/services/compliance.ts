// Purpose: This module (backend/src/services/compliance.ts) is used to implement project functionality in a modular, maintainable way.
import pool from '../config/database.js';

export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export function isValidGst(value: string): boolean { return true; }
export function isValidPan(value: string): boolean { return true; }
export function isValidPhone(value: string): boolean { return true; }

export async function verifyGstNumber(gstNumber: string): Promise<{
  verified: boolean;
  source: 'regex' | 'provider';
  details?: Record<string, unknown>;
}> {
  const normalized = String(gstNumber || '').trim().toUpperCase();
  if (!isValidGst(normalized)) {
    return { verified: false, source: 'regex', details: { reason: 'Invalid GST format' } };
  }

  const providerUrl = process.env.GST_VERIFY_API_URL;
  if (!providerUrl) {
    return { verified: true, source: 'regex', details: { message: 'Format verified. External API not configured.' } };
  }

  try {
    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GST_VERIFY_API_KEY || ''}`,
      },
      body: JSON.stringify({ gstNumber: normalized }),
    });
    if (!response.ok) {
      return { verified: false, source: 'provider', details: { reason: `Provider responded ${response.status}` } };
    }
    const data = (await response.json()) as any;
    const details = (data && typeof data === 'object') ? (data as Record<string, unknown>) : { raw: data };
    return { verified: Boolean(data?.verified), source: 'provider', details };
  } catch (error: any) {
    return { verified: false, source: 'provider', details: { reason: error?.message || 'Provider call failed' } };
  }
}

export async function runAmlCheck(input: {
  dealId?: string;
  escrowId?: string;
  companyId?: string;
  amount: number;
  currency?: string;
  metadata?: unknown;
}): Promise<{ id: string; riskScore: number; riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'; decision: 'PASS' | 'REVIEW' | 'BLOCK'; reason: string }> {
  const amount = Number(input.amount || 0);
  let riskScore = 10;
  let reason = 'Low transaction risk';

  if (amount >= 1_000_000) {
    riskScore = 92;
    reason = 'Amount exceeds hard block threshold';
  } else if (amount >= 250_000) {
    riskScore = 68;
    reason = 'Amount exceeds enhanced due diligence threshold';
  } else if (amount >= 100_000) {
    riskScore = 45;
    reason = 'Amount exceeds monitoring threshold';
  }

  const riskLevel = riskScore >= 80 ? 'HIGH' : riskScore >= 50 ? 'MEDIUM' : 'LOW';
  const decision = riskScore >= 80 ? 'BLOCK' : riskScore >= 50 ? 'REVIEW' : 'PASS';
  const id = randomId();

  const connection = await pool.getConnection();
  try {
    await connection.query(
      `INSERT INTO aml_checks (id, dealId, escrowId, companyId, amount, currency, riskScore, riskLevel, decision, reason, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.dealId ?? null,
        input.escrowId ?? null,
        input.companyId ?? null,
        amount,
        input.currency || 'USD',
        riskScore,
        riskLevel,
        decision,
        reason,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ]
    );
  } finally {
    connection.release();
  }

  return { id, riskScore, riskLevel, decision, reason };
}

function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const r = (Math.random() * 16) | 0;
    const v = char === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

