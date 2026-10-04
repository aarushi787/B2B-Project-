// CSRF protection for cookie-authenticated browsers.
//
// Auth lives in httpOnly cookies, which browsers attach automatically — so a malicious site could trigger
// state-changing requests. We require, for every unsafe request that relies on those cookies:
//   1. an allow-listed Origin (when the browser sends one), and
//   2. an X-CSRF-Token header equal to HMAC(JWT_SECRET, refresh cookie).
// The token is returned in JSON by login/register/refresh and GET /auth/csrf. Another origin can't read those
// responses (CORS allowlist), so it can't forge the header. This also works when the API is on a different
// domain than the frontend, where a double-submit cookie would not.
// Requests authenticated with an explicit `Authorization: Bearer` header are not ambient and are exempt.
import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { getAuthCookies } from '../services/tokens.js';
import { errorResponse } from '../utils/http.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Pre-auth endpoints: no session exists yet (or it is being replaced). They still get the Origin check.
const TOKEN_EXEMPT_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/verify-email'];

export function csrfTokenFor(sessionKey: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return crypto.createHmac('sha256', secret).update(`csrf:${sessionKey}`).digest('base64url');
}

export function csrfTokenForRequest(req: Request): string | null {
  const { access, refresh } = getAuthCookies(req);
  const key = refresh || access;
  return key ? csrfTokenFor(key) : null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function csrfProtection(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (req.headers.authorization?.startsWith('Bearer ')) return next();

    const origin = req.get('origin');
    if (origin && !allowedOrigins.includes(origin)) {
      return errorResponse(res, 403, 'CSRF_ORIGIN', 'Request origin is not allowed');
    }

    const expected = csrfTokenForRequest(req);
    if (!expected) return next(); // no ambient credentials: nothing to forge (login, webhooks, API clients)

    const path = (req.originalUrl || req.url).split('?')[0];
    if (TOKEN_EXEMPT_PATHS.includes(path)) return next();

    const provided = req.get('x-csrf-token');
    if (!provided || !safeEqual(provided, expected)) {
      return errorResponse(res, 403, 'CSRF_INVALID', 'Missing or invalid CSRF token');
    }
    return next();
  };
}
