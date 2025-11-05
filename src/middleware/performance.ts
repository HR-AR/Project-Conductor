/**
 * Performance Monitoring Middleware
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Response time tracking middleware
 * Adds X-Response-Time header and logs slow requests
 */
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Store original write function to intercept before headers are sent
  const originalWrite = res.write;
  const originalEnd = res.end;

  let headerSet = false;

  // Override write to set header on first write
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.write = function(this: Response, _chunk?: any, _encoding?: any, _callback?: any): boolean {
    if (!headerSet && !res.headersSent) {
      const duration = Date.now() - start;
      try {
        res.setHeader('X-Response-Time', `${duration}ms`);
      } catch (err) {
        // Ignore if headers already sent
      }
      headerSet = true;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return originalWrite.apply(this, arguments as any);
  };

  // Override end to set header and log slow requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.end = function(this: Response, _chunk?: any, _encoding?: any, _callback?: any): Response {
    const duration = Date.now() - start;

    // Set response time header before sending response if not already set
    if (!headerSet && !res.headersSent) {
      try {
        res.setHeader('X-Response-Time', `${duration}ms`);
      } catch (err) {
        // Ignore if headers already sent
      }
      headerSet = true;
    }

    // Log slow requests (> 1000ms)
    if (duration > 1000) {
      logger.warn({
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
      }, 'Slow request detected');
    }

    // Call original end with proper arguments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return originalEnd.apply(this, arguments as any);
  };

  next();
};

/**
 * Performance metrics tracking middleware
 * Tracks detailed performance metrics for monitoring
 */
export const performanceMetricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationNs = end - start;
    const durationMs = Number(durationNs) / 1_000_000;

    const metrics = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: durationMs.toFixed(2),
      contentLength: res.get('Content-Length') || '0',
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    };

    // Log performance metrics in development
    if (process.env['NODE_ENV'] === 'development' && durationMs > 100) {
      logger.debug(metrics, 'Performance metrics');
    }

    // In production, only log errors and slow requests
    if (process.env['NODE_ENV'] === 'production') {
      if (res.statusCode >= 400 || durationMs > 1000) {
        logger.info(metrics, 'Performance alert');
      }
    }
  });

  next();
};

/**
 * Request size limiting middleware
 * Logs warnings for large request bodies
 */
export const requestSizeMonitor = (req: Request, _res: Response, next: NextFunction): void => {
  const contentLength = parseInt(req.get('Content-Length') || '0', 10);

  // Warn on requests > 1MB
  if (contentLength > 1_000_000) {
    logger.warn({
      method: req.method,
      url: req.originalUrl,
      contentLength: `${(contentLength / 1_000_000).toFixed(2)}MB`,
    }, 'Large request body detected');
  }

  next();
};

/**
 * Memory usage monitoring (for debugging)
 * Should only be enabled in development
 */
export const memoryMonitor = (_req: Request, _res: Response, next: NextFunction): void => {
  if (process.env['NODE_ENV'] === 'development') {
    const memUsage = process.memoryUsage();
    const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);

    // Log if heap usage > 100MB
    if (memUsage.heapUsed > 100 * 1024 * 1024) {
      logger.debug({
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
      }, 'Memory usage high');
    }
  }

  next();
};
