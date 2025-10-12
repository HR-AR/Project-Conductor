interface LogMeta {
    [key: string]: unknown;
}
declare class Logger {
    private formatMessage;
    debug(message: string, meta?: LogMeta): void;
    info(message: string, meta?: LogMeta): void;
    warn(message: string, meta?: LogMeta): void;
    error(message: string, error?: unknown, meta?: LogMeta): void;
}
declare const logger: Logger;
export default logger;
//# sourceMappingURL=logger.d.ts.map