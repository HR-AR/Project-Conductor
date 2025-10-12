"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Logger {
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
    }
    debug(message, meta) {
        console.debug(this.formatMessage('debug', message, meta));
    }
    info(message, meta) {
        console.info(this.formatMessage('info', message, meta));
    }
    warn(message, meta) {
        console.warn(this.formatMessage('warn', message, meta));
    }
    error(message, error, meta) {
        const errorMeta = error instanceof Error
            ? { ...meta, error: error.message, stack: error.stack }
            : { ...meta, error };
        console.error(this.formatMessage('error', message, errorMeta));
    }
}
const logger = new Logger();
exports.default = logger;
//# sourceMappingURL=logger.js.map