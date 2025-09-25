/**
 * Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError as ExpressValidationError } from 'express-validator';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errors?: ExpressValidationError[] | undefined;
}

export class AppError extends Error implements ApiError {
  public statusCode: number;
  public isOperational: boolean;
  public errors?: ExpressValidationError[] | undefined;

  constructor(message: string, statusCode: number = 500, errors?: ExpressValidationError[]) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Custom error classes
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', errors?: ExpressValidationError[] | undefined) {
    super(message, 400, errors);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database error') {
    super(message, 500);
  }
}

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env['NODE_ENV'] === 'production';

  // Log error details
  console.error('Error occurred:', {
    message: err.message,
    statusCode,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      message: err.message,
      statusCode,
    },
  };

  // Include validation errors if present
  if (err.errors && err.errors.length > 0) {
    errorResponse.error.validationErrors = err.errors.map((validationError: any) => ({
      field: validationError.path || validationError.param,
      message: validationError.msg,
      value: validationError.value,
    }));
  }

  // Include stack trace in development
  if (!isProduction) {
    errorResponse.error.stack = err.stack;
  }

  // Handle specific error types
  if (err.message.includes('duplicate key value')) {
    errorResponse.error.message = 'Resource already exists';
    errorResponse.error.statusCode = 409;
    res.status(409);
  } else if (err.message.includes('violates foreign key constraint')) {
    errorResponse.error.message = 'Referenced resource not found';
    errorResponse.error.statusCode = 400;
    res.status(400);
  } else {
    res.status(statusCode);
  }

  res.json(errorResponse);
};

/**
 * Not found middleware
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
      statusCode: 404,
    },
  });
};

/**
 * Async wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };

    if (process.env['NODE_ENV'] === 'development') {
      console.log('Request:', logData);
    }
  });

  next();
};

/**
 * Rate limiting helper
 */
export const createRateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
  const clients = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, _next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();

    // Get or create client record
    let client = clients.get(clientId);
    if (!client || now > client.resetTime) {
      client = { count: 0, resetTime: now + windowMs };
      clients.set(clientId, client);
    }

    client.count++;

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - client.count).toString(),
      'X-RateLimit-Reset': new Date(client.resetTime).toISOString(),
    });

    if (client.count > max) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests',
          statusCode: 429,
          retryAfter: Math.ceil((client.resetTime - now) / 1000),
        },
      });
      return;
    }

    _next();
  };
};

/**
 * CORS middleware
 */
export const corsHandler = (req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',') || ['*'];

  const origin = req.get('Origin');
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
};