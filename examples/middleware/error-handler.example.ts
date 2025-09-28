/**
 * PATTERN: Express Error Handling Middleware with Custom Error Classes
 * USE WHEN: Implementing centralized error handling, creating consistent API error responses
 * KEY CONCEPTS: Error class hierarchy, async error catching, error transformation, logging
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError as ExpressValidationError } from 'express-validator';

/**
 * Base API Error Interface
 */
export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errors?: any[];
  code?: string;
}

/**
 * Base Application Error Class
 *
 * Key patterns:
 * - Custom error class extending Error
 * - Operational vs programming errors
 * - Stack trace preservation
 * - Additional metadata support
 */
export class AppError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public errors?: any[];

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    errors?: any[]
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.errors = errors;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);

    // Set prototype explicitly for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Specific Error Classes
 *
 * Key patterns:
 * - Semantic error types
 * - Default messages and status codes
 * - Consistent error codes for client handling
 */

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', errors?: any[]) {
    super(message, 400, true, 'VALIDATION_ERROR', errors);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, true, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, true, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true, 'CONFLICT');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, true, 'BAD_REQUEST');
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED');
    if (retryAfter) {
      this.errors = [{ retryAfter }];
    }
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, false, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Main Error Handling Middleware
 *
 * Key patterns:
 * - Centralized error processing
 * - Environment-aware responses
 * - Error logging and monitoring
 * - Consistent response format
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default to 500 if no status code
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error details
  logError(err, req);

  // Handle specific database errors
  const transformedError = transformDatabaseError(err);

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      message: transformedError.message,
      code: transformedError.code || 'INTERNAL_ERROR',
      statusCode: transformedError.statusCode || statusCode,
    },
  };

  // Add validation errors if present
  if (transformedError.errors && transformedError.errors.length > 0) {
    errorResponse.error.details = transformedError.errors;
  }

  // Include debug information in development
  if (!isProduction) {
    errorResponse.error.stack = transformedError.stack;
    errorResponse.error.raw = err.message;
  }

  // Add request ID for tracing
  const requestId = req.headers['x-request-id'] || generateRequestId();
  errorResponse.error.requestId = requestId;

  // Set response headers
  res.setHeader('X-Request-Id', requestId);

  // Send error response
  res.status(transformedError.statusCode || statusCode).json(errorResponse);
};

/**
 * Async Handler Wrapper
 *
 * Key patterns:
 * - Automatic promise rejection catching
 * - Eliminates try-catch boilerplate
 * - Preserves middleware signature
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): Promise<any> => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not Found Handler
 *
 * Key patterns:
 * - 404 route handling
 * - Helpful error messages
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    error: {
      message: error.message,
      code: error.code,
      statusCode: 404,
      requestId: req.headers['x-request-id'] || generateRequestId(),
    },
  });
};

/**
 * Transform Database Errors
 *
 * Key patterns:
 * - Database error normalization
 * - User-friendly messages
 * - Security through obscurity
 */
function transformDatabaseError(err: ApiError): ApiError {
  const message = err.message || '';

  // PostgreSQL unique constraint violation
  if (message.includes('duplicate key value')) {
    return new ConflictError('Resource already exists');
  }

  // Foreign key constraint violation
  if (message.includes('violates foreign key constraint')) {
    return new BadRequestError('Referenced resource does not exist');
  }

  // Not null constraint violation
  if (message.includes('violates not-null constraint')) {
    const field = extractFieldFromError(message);
    return new ValidationError(`Required field missing: ${field}`);
  }

  // Check constraint violation
  if (message.includes('violates check constraint')) {
    return new ValidationError('Invalid data provided');
  }

  // Connection errors
  if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
    return new ServiceUnavailableError('Database connection failed');
  }

  return err;
}

/**
 * Log Error Details
 *
 * Key patterns:
 * - Structured logging
 * - Context preservation
 * - Monitoring integration
 */
function logError(err: ApiError, req: Request): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack,
      isOperational: err.isOperational,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: req.body,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
  };

  if (err.isOperational) {
    console.error('Operational error:', errorLog);
  } else {
    // Programming errors should trigger alerts
    console.error('Programming error - CRITICAL:', errorLog);
    // notifyOpsTeam(errorLog);
  }

  // Send to monitoring service in production
  if (process.env.NODE_ENV === 'production') {
    // sendToMonitoring(errorLog);
  }
}

/**
 * Validation Error Handler
 *
 * Key patterns:
 * - Express-validator integration
 * - Field-level error details
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = (req as any).validationErrors?.();

  if (errors && errors.length > 0) {
    const formattedErrors = errors.map((err: ExpressValidationError) => ({
      field: (err as any).path || (err as any).param,
      message: err.msg,
      value: (err as any).value,
    }));

    throw new ValidationError('Validation failed', formattedErrors);
  }

  next();
};

/**
 * Rate Limiting Error Factory
 *
 * Key patterns:
 * - Custom error for rate limiting
 * - Retry-After header support
 */
export const createRateLimitError = (
  windowMs: number,
  maxRequests: number
): AppError => {
  const retryAfter = Math.ceil(windowMs / 1000);
  return new TooManyRequestsError(
    `Rate limit exceeded. Maximum ${maxRequests} requests per ${retryAfter} seconds.`,
    retryAfter
  );
};

/**
 * Helper Functions
 */

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function extractFieldFromError(message: string): string {
  const match = message.match(/column "([^"]+)"/);
  return match ? match[1] : 'unknown field';
}

/**
 * Error Recovery Middleware
 *
 * Key patterns:
 * - Circuit breaker pattern
 * - Graceful degradation
 */
export const errorRecovery = (serviceName: string) => {
  let errorCount = 0;
  let lastErrorTime = 0;
  const threshold = 5;
  const resetTime = 60000; // 1 minute

  return (err: Error, req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();

    // Reset counter if enough time has passed
    if (now - lastErrorTime > resetTime) {
      errorCount = 0;
    }

    errorCount++;
    lastErrorTime = now;

    // Circuit breaker triggered
    if (errorCount >= threshold) {
      console.error(`Circuit breaker triggered for ${serviceName}`);
      res.status(503).json({
        success: false,
        error: {
          message: `${serviceName} is temporarily unavailable`,
          code: 'SERVICE_CIRCUIT_OPEN',
          retryAfter: Math.ceil(resetTime / 1000),
        },
      });
      return;
    }

    next(err);
  };
};

export default errorHandler;