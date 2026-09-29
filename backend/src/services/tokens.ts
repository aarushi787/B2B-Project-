// Purpose: This module (backend/src/services/tokens.ts) is used to implement project functionality in a modular, maintainable way.
import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';

type AuthTokenPayload = {
  userId: string;
  companyId: string | null;
  role: string;
  type: 'access';
};

const ACCESS_COOKIE_NAME = process.env.ACCESS_TOKEN_COOKIE_NAME || 'access_token';
const REFRESH_COOKIE_NAME = process.env.REFRESH_TOKEN_COOKIE_NAME || 'refresh_token';

const ACCESS_TOKEN_MAX_AGE_MS = Number(process.env.ACCESS_TOKEN_MAX_AGE_MS || 15 * 60 * 1000);
const REFRESH_TOKEN_MAX_AGE_MS = Number(process.env.REFRESH_TOKEN_MAX_AGE_MS || 7 * 24 * 60 * 60 * 1000);
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';

function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf('=');
    if (index < 0) return acc;
    const key = decodeURIComponent(part.slice(0, index).trim());
    const value = decodeURIComponent(part.slice(index + 1).trim());
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export function getAccessTokenFromRequest(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[ACCESS_COOKIE_NAME];
}

export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const bodyToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
  if (bodyToken) return bodyToken;

  const cookies = parseCookies(req.headers.cookie);
  return cookies[REFRESH_COOKIE_NAME];
}

export function signAccessToken(payload: Omit<AuthTokenPayload, 'type'>): string {
  const signPayload: AuthTokenPayload = {
    ...payload,
    type: 'access',
  };
  return jwt.sign(signPayload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY } as SignOptions);
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}

export function createRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiryDate(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = secure ? 'none' : 'lax';
  res.cookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    path: '/',
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: '/',
  });
}

export function clearAuthCookies(res: Response): void {
  const secure = process.env.NODE_ENV === 'production';
  const sameSite = secure ? 'none' : 'lax';
  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  });
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  });
}

