// Purpose: This module (backend/src/utils/encryption.ts) is used to implement project functionality in a modular, maintainable way.
import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const secret = process.env.DATA_ENCRYPTION_KEY || '';
  const normalized = secret.trim();
  if (normalized.length === 0) {
    throw new Error('DATA_ENCRYPTION_KEY is required for encrypted storage');
  }

  // Accept a 64-char hex key, otherwise derive a fixed 32-byte key.
  if (/^[0-9a-fA-F]{64}$/.test(normalized)) {
    return Buffer.from(normalized, 'hex');
  }
  return crypto.createHash('sha256').update(normalized).digest();
}

export function encryptJson(data: unknown): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptJson<T = any>(value: string): T {
  const key = getKey();
  const [ivPart, tagPart, encryptedPart] = String(value).split(':');
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Invalid encrypted payload format');
  }
  const iv = Buffer.from(ivPart, 'base64');
  const tag = Buffer.from(tagPart, 'base64');
  const encrypted = Buffer.from(encryptedPart, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as T;
}


