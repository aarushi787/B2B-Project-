// Purpose: This module (backend/src/observability/sentry.ts) is used to implement project functionality in a modular, maintainable way.
import * as Sentry from '@sentry/node';
import { logger } from '../utils/logger.js';

let initialized = false;

export function initSentry() {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
  });

  initialized = true;
  logger.info({ hasSentry: true }, 'Sentry initialized');
}

export { Sentry };

