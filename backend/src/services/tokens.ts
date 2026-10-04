// Purpose: This module (backend/src/services/tokens.ts) is used to implement project functionality in a modular, maintainable way.
import crypto from 'crypto';
import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';

type AuthTokenPayload = {
  userId: string;
  companyId: string | null;
  role: string;
  type: 'access' | 'socket';
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

// Refresh tokens are accepted from the httpOnly cookie only, never from the request body.
export function getRefreshTokenFromRequest(req: Request): string | undefined {
  return getAuthCookies(req).refresh;
}

export function getAuthCookies(req: Request): { access?: string; refresh?: string } {
  const cookies = parseCookies(req.headers.cookie);
  return { access: cookies[ACCESS_COOKIE_NAME] || undefined, refresh: cookies[REFRESH_COOKIE_NAME] || undefined };
}

export function signAccessToken(payload: Omit<AuthTokenPayload, 'type'>): string {
  const signPayload: AuthTokenPayload = {
    ...payload,
    type: 'access',
  };
  return jwt.sign(signPayload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY } as SignOptions);
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
  // Only real access tokens: a short-lived websocket token must never authenticate REST requests.
  if (decoded.type !== 'access') throw new Error('Not an access token');
  return decoded;
}

export const SOCKET_TOKEN_TTL_SECONDS = 60;

/**
 * A 60-second token used only to open a websocket. Browsers behind a different domain (Vercel frontend, Render API)
 * may not send the auth cookie on the websocket handshake, so the page fetches one of these over the normal
 * cookie-authenticated API and presents it once. It is never stored and cannot be used for the REST API.
 */
export function signSocketToken(payload: { userId: string; companyId: string | null; role: string }): string {
  const signPayload: AuthTokenPayload = { ...payload, type: 'socket' };
  return jwt.sign(signPayload, getJwtSecret(), { expiresIn: SOCKET_TOKEN_TTL_SECONDS } as SignOptions);
}

export function verifySocketToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
  if (decoded.type !== 'socket') throw new Error('Not a socket token');
  return decoded;
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

/**
 * Cookie flags. COOKIE_SAMESITE (lax | strict | none) overrides the default, which is 'none' in production
 * (frontend and API on different sites) and 'lax' elsewhere. When the frontend proxies /api to this server
 * (see DEPLOY.md) the browser sees one site, so use 'lax': it is safer and works in Safari.
 */
export function cookieFlags(env: { NODE_ENV?: string; COOKIE_SAMESITE?: string } = process.env): { secure: boolean; sameSite: 'lax' | 'strict' | 'none' } {
  const configured = (env.COOKIE_SAMESITE || '').toLowerCase();
  const production = env.NODE_ENV === 'production';
  const sameSite = configured === 'lax' || configured === 'strict' || configured === 'none' ? configured : production ? 'none' : 'lax';
  // Browsers reject SameSite=None cookies that are not Secure.
  return { secure: production || sameSite === 'none', sameSite };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const { secure, sameSite } = cookieFlags();
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
  const { secure, sameSite } = cookieFlags();
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

