/**
 * Logger module using Winston for structured logging.
 * Configures logging based on the configured log level and outputs to console.
 *
 * Supported log levels: error, warn, info, debug (default: info).
 * Output format: JSON with timestamp for structured logs, colorized simple format for console output.
 */
import winston from 'winston';
import config from './config.js';

const logLevel = config.logLevel;

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Winston logger instance configured for the application.
 * @type {winston.Logger}
 */
export default logger;