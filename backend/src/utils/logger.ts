// Purpose: This module (backend/src/utils/logger.ts) is used to implement project functionality in a modular, maintainable way.
import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';

const baseLogger = pino({
  level,
  base: {
    service: 'b2bforcorporates-backend',
    env: process.env.NODE_ENV || 'development',
  },
  redact: {
    paths: ['req.headers.authorization', 'headers.authorization', 'password', '*.password', 'token', '*.token'],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

type LogMethod = (messageOrContext?: unknown, context?: unknown, ...extra: unknown[]) => void;

function normalizeContext(value: unknown): Record<string, unknown> {
  if (value instanceof Error) return { err: value };
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  return { value };
}

function createLogMethod(levelName: 'debug' | 'info' | 'warn' | 'error'): LogMethod {
  const fn = baseLogger[levelName].bind(baseLogger) as (obj: unknown, msg?: string, ...args: unknown[]) => void;

  return (messageOrContext?: unknown, context?: unknown, ...extra: unknown[]) => {
    if (typeof messageOrContext === 'string') {
      if (typeof context === 'undefined') {
        fn({}, messageOrContext, ...extra);
        return;
      }
      fn(
        {
          ...normalizeContext(context),
          ...(extra.length > 0 ? { extra } : {}),
        },
        messageOrContext
      );
      return;
    }

    if (typeof context === 'string') {
      fn(
        {
          ...normalizeContext(messageOrContext),
          ...(extra.length > 0 ? { extra } : {}),
        },
        context
      );
      return;
    }

    if (typeof messageOrContext !== 'undefined') {
      fn(
        {
          ...normalizeContext(messageOrContext),
          ...(typeof context !== 'undefined' ? { context } : {}),
          ...(extra.length > 0 ? { extra } : {}),
        },
        'log'
      );
      return;
    }

    fn({}, 'log');
  };
}

export const logger = {
  debug: createLogMethod('debug'),
  info: createLogMethod('info'),
  warn: createLogMethod('warn'),
  error: createLogMethod('error'),
};
