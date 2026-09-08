/**
 * An error the API deliberately surfaces to the client.
 *
 * Anything thrown that is *not* an AppError is treated as a bug: the error middleware logs it
 * in full and returns a generic 500, so internal details never leak to the client. Domain and
 * service code should therefore throw AppError for expected failures ("goal is already full",
 * "not your request to approve") and let genuine bugs propagate untouched.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You are not allowed to do that') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, details?: unknown) {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static tooManyRequests(message = 'Too many requests, please slow down') {
    return new AppError(429, 'TOO_MANY_REQUESTS', message);
  }
}
