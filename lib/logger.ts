import * as log from "std/log/mod.ts";
import config from "./config.ts";

/**
 * Logger module using Deno standard library for structured logging.
 * Configures logging based on the configured log level and outputs to console.
 *
 * Supported log levels: error, warn, info, debug (default: info).
 */
const logLevel = config.logLevel as log.LevelName;

await log.setup({
  handlers: {
    console: new log.ConsoleHandler(logLevel, {
      formatter: (record) => {
        const timestamp = new Date(record.datetime).toISOString();
        const level = record.levelName;
        const msg = record.msg;
        return `[${timestamp}] ${level}: ${msg}`;
      },
    }),
  },
  loggers: {
    default: {
      level: logLevel,
      handlers: ["console"],
    },
  },
});

/**
 * Logger instance configured for the application.
 */
const logger = log.getLogger();

export default logger;

