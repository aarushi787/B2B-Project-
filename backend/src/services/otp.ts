// One-time codes for verifying a phone number. Pure functions, so every rule is unit-tested without a database or an SMS.
//
//  - A code is 6 digits, valid for 10 minutes, and can be tried 5 times.
//  - Only a keyed hash of the code is stored (HMAC of user + phone + code), never the code itself.
//  - A new code can be asked for once a minute, and at most 5 times an hour.
import crypto from 'crypto';

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_SENDS_PER_HOUR = 5;

/** "+91 98765-43210" becomes "+919876543210". Returns null when it is not a plausible international number. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/[\s\-().]/g, '');
  return /^\+?[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
}

/** "+919876543210" becomes "+91••••••3210", so a screen can confirm the number without showing all of it. */
export function maskPhone(phone: string): string {
  return phone.length <= 6 ? phone : `${phone.slice(0, 3)}${'•'.repeat(Math.max(phone.length - 7, 2))}${phone.slice(-4)}`;
}

export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashCode(secret: string, userId: string, phone: string, code: string): string {
  return crypto.createHmac('sha256', secret).update(`otp:${userId}:${phone}:${code}`).digest('hex');
}

export function codeMatches(expectedHash: string, secret: string, userId: string, phone: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const actual = Buffer.from(hashCode(secret, userId, phone, code));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export type SendDecision = { ok: true } | { ok: false; status: number; retryAfterSeconds: number; message: string };

export function canSendCode(input: { lastSentAt?: Date | string | null; sendsLastHour: number; now?: Date }): SendDecision {
  const now = (input.now ?? new Date()).getTime();
  if (input.lastSentAt) {
    const wait = new Date(input.lastSentAt).getTime() + OTP_RESEND_COOLDOWN_MS - now;
    if (wait > 0) {
      const s = Math.ceil(wait / 1000);
      return { ok: false, status: 429, retryAfterSeconds: s, message: `Please wait ${s} seconds before asking for another code.` };
    }
  }
  if (input.sendsLastHour >= OTP_MAX_SENDS_PER_HOUR) {
    return { ok: false, status: 429, retryAfterSeconds: 3600, message: 'You have asked for too many codes. Please try again in an hour.' };
  }
  return { ok: true };
}

export type AttemptDecision = { ok: true; attemptsLeft: number } | { ok: false; reason: 'none' | 'expired' | 'locked'; message: string };

export function canTryCode(row: { expiresAt: Date | string; attempts: number; consumedAt?: Date | string | null } | undefined | null, now: Date = new Date()): AttemptDecision {
  if (!row || row.consumedAt) return { ok: false, reason: 'none', message: 'Ask for a new code first.' };
  if (new Date(row.expiresAt).getTime() <= now.getTime()) return { ok: false, reason: 'expired', message: 'That code has expired. Ask for a new one.' };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'locked', message: 'Too many wrong tries. Ask for a new code.' };
  return { ok: true, attemptsLeft: OTP_MAX_ATTEMPTS - row.attempts };
}
