/**
 * Winston Logger Configuration
 *
 * Provides structured logging for the application with:
 * - Console output (always enabled)
 * - File output (logs/app.log and logs/error.log)
 * - Log levels controlled by LOG_LEVEL env variable
 *
 * Usage:
 *   import logger from '@/lib/logger'
 *   logger.info('Message here')
 *   logger.error('Error occurred', { error: err })
 *   logger.debug('Debug info') // Only shown when LOG_LEVEL=debug
 */

import winston from "winston";
import path from "path";

// Determine log level from environment
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const serviceTag = service ? `[${service}]` : "";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level} ${serviceTag} ${message}${metaStr}`;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Define log directory (relative to project root)
const LOG_DIR = path.join(process.cwd(), "logs");

// Create transport list
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Only add file transports in development
if (process.env.NODE_ENV === "development") {
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, "app.log"),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the root logger (without default service)
const rootLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports,
});

// Create child loggers for different services
export function createLogger(service: string) {
  return rootLogger.child({ service });
}

// Export default logger (app service)
export default rootLogger.child({ service: "app" });
