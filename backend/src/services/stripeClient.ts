// One place that knows whether card payments are set up. Without STRIPE_SECRET_KEY nothing here pretends to work:
// escrow stays disabled and the API answers 503, so no funds are ever "held" on paper only.
import Stripe from 'stripe';
import { ApiError } from '../utils/http.js';
import { logger } from '../utils/logger.js';

let client: Stripe | null = null;

export function paymentsEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
}

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/** Releases money held by a manual-capture PaymentIntent. Throws (so the caller can roll back) if it cannot. */
export async function captureHeldPayment(paymentIntentId: string | null | undefined): Promise<void> {
  const stripe = getStripe();
  if (!stripe) throw new ApiError(503, 'PAYMENTS_NOT_CONFIGURED', 'Payments are not configured, so escrow funds cannot be released.');
  if (!paymentIntentId) throw new ApiError(409, 'CONFLICT', 'This milestone has no escrow payment to release.');
  try {
    await stripe.paymentIntents.capture(paymentIntentId);
  } catch (error) {
    logger.error('Escrow capture failed:', error);
    throw new ApiError(502 as number, 'INTERNAL_ERROR', 'The payment provider could not release the funds, so the milestone was not confirmed. Please try again.');
  }
}
