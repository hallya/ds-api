import pino from "pino";
import config from "./config.ts";

/**
 * Map Deno log levels to Pino log levels
 */
const levelMap: Record<string, pino.Level> = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
};

const configuredLevel = config.logLevel || "INFO";
const isSilent = String(configuredLevel) === "SILENT";
const pinoLevel = isSilent ? "fatal" : levelMap[configuredLevel] || "info";

/**
 * Determine if we should use pretty printing
 * Use pretty print in development (when not SILENT and not in production)
 */
const usePrettyPrint = !isSilent && Deno.env.get("NODE_ENV") !== "production";

/**
 * Create Pino logger instance with appropriate configuration
 */
const pinoLogger = pino({
  level: pinoLevel,

  transport: usePrettyPrint
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
          singleLine: false,
        },
      }
    : undefined,

  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Logger wrapper that maintains compatibility with std/log API
 * while using Pino under the hood for better performance and features
 */
const logger = {
  /**
   * Log an info message
   */
  info: (msg: string, ...args: unknown[]) => {
    if (isSilent) return;
    if (args.length > 0) {
      pinoLogger.info({}, msg, ...args);
    } else {
      pinoLogger.info(msg);
    }
  },

  /**
   * Log an error message
   */
  error: (msg: string, ...args: unknown[]) => {
    if (isSilent) return;
    if (args.length > 0) {
      pinoLogger.error({}, msg, ...args);
    } else {
      pinoLogger.error(msg);
    }
  },

  /**
   * Log a warning message
   */
  warn: (msg: string, ...args: unknown[]) => {
    if (isSilent) return;
    if (args.length > 0) {
      pinoLogger.warn({}, msg, ...args);
    } else {
      pinoLogger.warn(msg);
    }
  },

  /**
   * Log a debug message
   */
  debug: (msg: string, ...args: unknown[]) => {
    if (isSilent) return;
    if (args.length > 0) {
      pinoLogger.debug({}, msg, ...args);
    } else {
      pinoLogger.debug(msg);
    }
  },
};

export default logger;
