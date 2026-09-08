import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/AppError.js';
import { isProduction } from '../config/env.js';

/** Catch-all for unmatched routes, so a typo'd URL returns JSON rather than Express' HTML page. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

/**
 * The single place errors become HTTP responses.
 *
 * Every error shape the API can produce is normalised here into
 * `{ error: { code, message, details? } }`, so the web client only ever has to understand one
 * response shape regardless of whether the failure came from validation, domain rules or a bug.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Request-body validation failures — turned into a field-keyed map the forms can consume.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Some fields are invalid',
        details: err.issues.reduce<Record<string, string>>((acc, issue) => {
          const key = issue.path.join('.') || '_';
          if (!acc[key]) acc[key] = issue.message;
          return acc;
        }, {}),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Anything else is a bug. Log it in full, tell the client nothing.
  console.error('[unhandled error]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our end',
      ...(isProduction ? {} : { details: err instanceof Error ? err.message : String(err) }),
    },
  });
}
