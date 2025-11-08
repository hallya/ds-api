import Joi from 'joi';

/**
 * Configuration module for the Synology Download Station CLI tool.
 * Validates and provides access to environment variables and configuration settings.
 */
const configSchema = Joi.object({
  SYNOLOGY_USERNAME: Joi.string().optional(),
  SYNOLOGY_PASSWORD: Joi.string().required(),
  SYNOLOGY_BASE_PATH: Joi.string().optional(),
  SYNOLOGY_DISABLE_SSL_VERIFICATION: Joi.string().valid('true', 'false').optional(),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').optional(),
  NAS_URL: Joi.string().uri().optional(),
  RETRY_ATTEMPTS: Joi.number().integer().min(0).optional(),
  RETRY_DELAY: Joi.number().integer().min(0).optional(),
}).unknown(true);

const { error, value } = configSchema.validate(process.env);

if (error) {
  throw new Error(`Configuration validation error: ${error.details.map(d => d.message).join(', ')}`);
}

/**
 * Configuration object containing validated environment variables and default values.
 * @typedef {Object} Config
 * @property {string} [synologyUsername] - The username for Synology authentication.
 * @property {string} synologyPassword - The password for Synology authentication.
 * @property {string} [synologyBasePath] - The base path for Synology operations.
 * @property {boolean} synologyDisableSslVerification - Whether to disable SSL verification.
 * @property {string} logLevel - The logging level (error, warn, info, debug).
 * @property {string} nasUrl - The NAS URL for API calls.
 * @property {number} retryAttempts - Number of retry attempts for API calls.
 * @property {number} retryDelay - Delay between retry attempts in milliseconds.
 */
const config = {
  synologyUsername: value.SYNOLOGY_USERNAME,
  synologyPassword: value.SYNOLOGY_PASSWORD,
  synologyBasePath: value.SYNOLOGY_BASE_PATH,
  synologyDisableSslVerification: value.SYNOLOGY_DISABLE_SSL_VERIFICATION === 'true',
  logLevel: value.LOG_LEVEL || 'info',
  nasUrl: value.NAS_URL,
  retryAttempts: value.RETRY_ATTEMPTS || 3,
  retryDelay: value.RETRY_DELAY || 1000,
};

/** @type {Config} */
export default config;