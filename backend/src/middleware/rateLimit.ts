// Purpose: This module (backend/src/middleware/rateLimit.ts) is used to implement project functionality in a modular, maintainable way.
import rateLimit from 'express-rate-limit';

// Brute-force protection for login/register: only FAILED attempts count (successful ones are skipped),
// 20 per 15 minutes per IP by default. Override with AUTH_RATE_LIMIT_MAX (CI/E2E creates many accounts).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: 15 * 60,
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for non-authentication requests
    return false;
  },
  keyGenerator: (req) => {
    // Rate limit by IP, not by user (prevents account enumeration)
    return req.ip || 'unknown';
  },
});

// Moderate rate limiting for general API endpoints (60 requests per minute)
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per window
  message: {
    error: 'API rate limit exceeded. Please try again later.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
});

// Loose rate limiting for public endpoints (300 requests per hour)
export const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 300, // 300 requests per window
  message: {
    error: 'Rate limit exceeded. Please try again later.',
    retryAfter: 60 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
});
