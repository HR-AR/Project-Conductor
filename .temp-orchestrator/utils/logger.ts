/**
 * Logger Utility
 * Simple logger for orchestrator agents
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  debug(message: string, meta?: LogMeta): void {
    console.debug(this.formatMessage('debug', message, meta));
  }

  info(message: string, meta?: LogMeta): void {
    console.info(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: LogMeta): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: unknown, meta?: LogMeta): void {
    const errorMeta = error instanceof Error
      ? { ...meta, error: error.message, stack: error.stack }
      : { ...meta, error };
    console.error(this.formatMessage('error', message, errorMeta));
  }
}

const logger = new Logger();

export default logger;
