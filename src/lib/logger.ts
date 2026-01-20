/**
 * Production Logging Configuration - Simplified
 * Replaces console.log with structured winston logging
 */

import winston from 'winston';

// Create simple production logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ult-trading-platform' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Security filter - prevent logging sensitive information
const secureLogger = {
  log: (level: string, message: string, meta?: any) => {
    // Filter out sensitive information
    if (meta) {
      const sanitizedMeta = { ...meta };

      // Remove sensitive fields
      delete sanitizedMeta.password;
      delete sanitizedMeta.token;
      delete sanitizedMeta.secret;
      delete sanitizedMeta.api_key;
      delete sanitizedMeta.sensitive_data;

      logger.log(level, message, sanitizedMeta);
    } else {
      logger.log(level, message);
    }
  },
  error: (message: string, meta?: any) => {
    logger.error(message, meta);
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },
  http: (message: string, meta?: any) => {
    logger.http(message, meta);
  },
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  },
};

// Create streams for Morgan HTTP logging
export const morganStream = {
  write: (message: string) => {
    secureLogger.http(message.trim());
  },
};

// Export both the original winston logger and secure wrapper
export { logger, secureLogger };

// Default export for backward compatibility
export default secureLogger;
