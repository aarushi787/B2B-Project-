// Purpose: This module (backend/src/middleware/errorEnvelope.ts) is used to implement project functionality in a modular, maintainable way.
import { NextFunction, Request, Response } from 'express';

function statusToCode(status: number) {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 422) return 'VALIDATION_ERROR';
  return 'INTERNAL_ERROR';
}

export function normalizeErrorEnvelope(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    if (res.statusCode >= 400) {
      const hasStandardShape =
        !!body &&
        typeof body === 'object' &&
        (body as any).success === false &&
        typeof (body as any).error?.code === 'string';

      if (hasStandardShape) {
        return originalJson(body as any);
      }

      const message =
        (typeof (body as any)?.error === 'string' && (body as any).error) ||
        (typeof (body as any)?.message === 'string' && (body as any).message) ||
        'Request failed';

      const details = (body as any)?.details;
      return originalJson({
        success: false,
        error: {
          code: statusToCode(res.statusCode),
          message,
          ...(details === undefined ? {} : { details }),
        },
      });
    }

    return originalJson(body as any);
  }) as Response['json'];

  next();
}

