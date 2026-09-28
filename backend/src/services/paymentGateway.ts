// Purpose: This module (backend/src/services/paymentGateway.ts) is used to implement project functionality in a modular, maintainable way.
import crypto from 'crypto';
import fetch from 'node-fetch';

type CreateGatewayIntentInput = {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, unknown>;
};

type GatewayIntentResult = {
  provider: 'razorpay';
  providerIntentId: string;
  amount: number;
  currency: string;
  raw: unknown;
};

export type GatewayPaymentStatus = {
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  providerPaymentId?: string;
  failureReason?: string;
  raw: unknown;
};

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const baseUrl = process.env.RAZORPAY_API_BASE_URL || 'https://api.razorpay.com/v1';

  return { keyId, keySecret, webhookSecret, baseUrl };
}

export function amountToSubunits(amount: number, currency: string): number {
  const normalized = currency.toUpperCase();
  // INR and most standard fiat currencies are two-decimal currencies.
  const multiplier = normalized === 'JPY' ? 1 : 100;
  return Math.round(amount * multiplier);
}

export async function createGatewayIntent(input: CreateGatewayIntentInput): Promise<GatewayIntentResult> {
  const provider = (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase();
  if (provider !== 'razorpay') {
    throw new Error(`Unsupported PAYMENT_PROVIDER: ${provider}`);
  }

  const { keyId, keySecret, baseUrl } = getRazorpayConfig();
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)');
  }

  const subunits = amountToSubunits(input.amount, input.currency);
  const response = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: subunits,
      currency: input.currency.toUpperCase(),
      receipt: input.receipt,
      notes: input.notes ?? {},
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Razorpay order creation failed: ${JSON.stringify(payload)}`);
  }

  return {
    provider: 'razorpay',
    providerIntentId: String((payload as any).id),
    amount: input.amount,
    currency: input.currency.toUpperCase(),
    raw: payload,
  };
}

export function verifyGatewayWebhookSignature(rawBody: Buffer, signatureHeader?: string): boolean {
  const provider = (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase();
  if (provider !== 'razorpay') return false;

  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret || !signatureHeader) return false;

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expected.length !== signatureHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

export async function fetchGatewayPaymentStatus(providerIntentId: string): Promise<GatewayPaymentStatus> {
  const provider = (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase();
  if (provider !== 'razorpay') {
    throw new Error(`Unsupported PAYMENT_PROVIDER: ${provider}`);
  }

  const { keyId, keySecret, baseUrl } = getRazorpayConfig();
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured (RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)');
  }

  const response = await fetch(`${baseUrl}/orders/${providerIntentId}/payments`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Razorpay order payment lookup failed: ${JSON.stringify(payload)}`);
  }

  const items = Array.isArray((payload as any)?.items) ? (payload as any).items : [];
  const succeeded = items.find((item: any) => String(item?.status || '').toLowerCase() === 'captured');
  if (succeeded) {
    return {
      status: 'SUCCEEDED',
      providerPaymentId: String(succeeded.id),
      raw: payload,
    };
  }

  const failed = items.find((item: any) =>
    ['failed', 'cancelled', 'refunded'].includes(String(item?.status || '').toLowerCase())
  );
  if (failed) {
    return {
      status: 'FAILED',
      providerPaymentId: String(failed.id || ''),
      failureReason: String(failed.error_description || failed.error_reason || 'Payment failed'),
      raw: payload,
    };
  }

  return {
    status: 'PENDING',
    raw: payload,
  };
}
