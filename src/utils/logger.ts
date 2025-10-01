import pino from 'pino';

const isDevelopment = process.env['NODE_ENV'] !== 'production';

/**
 * Pino logger instance configured for the application.
 *
 * In development:
 * - Uses pino-pretty for human-readable output
 * - Colorized output for better readability
 * - Timestamps in human-readable format
 *
 * In production:
 * - JSON output for structured logging
 * - Machine-parseable format for log aggregation
 * - Includes hostname and process ID for distributed systems
 */
const logger = pino({
  level: process.env['LOG_LEVEL'] || (isDevelopment ? 'debug' : 'info'),

  // Base logging configuration
  base: {
    pid: process.pid,
    hostname: process.env['HOSTNAME'] || 'localhost',
    env: process.env['NODE_ENV'] || 'development',
  },

  // Timestamp configuration
  timestamp: pino.stdTimeFunctions.isoTime,

  // Redact sensitive fields from logs
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'access_token',
      'refresh_token',
      'secret',
      'apiKey',
      'api_key',
    ],
    censor: '[REDACTED]',
  },

  // Transport for development (pino-pretty)
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        messageFormat: '{levelLabel} - {msg}',
      },
    },
  }),

  // Error serialization
  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/**
 * Create a child logger with additional context.
 *
 * @param bindings - Additional fields to include in all log messages
 * @returns Child logger instance
 *
 * @example
 * const requestLogger = createChildLogger({ requestId: '123', userId: 'user-456' });
 * requestLogger.info('Processing request');
 */
export function createChildLogger(bindings: Record<string, unknown>): pino.Logger {
  return logger.child(bindings);
}

/**
 * Singleton logger instance for the application.
 */
export default logger;