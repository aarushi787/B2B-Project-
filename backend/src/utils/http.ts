// Purpose: This module (backend/src/utils/http.ts) is used to implement project functionality in a modular, maintainable way.
import { Response } from 'express';

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorResponse(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown
) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
}

