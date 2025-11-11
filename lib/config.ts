import { z } from "zod";

/**
 * Configuration schema for environment variables validation.
 */
const configSchema = z.object({
  SYNOLOGY_USERNAME: z.string().optional(),
  SYNOLOGY_PASSWORD: z.string().min(1, "SYNOLOGY_PASSWORD is required"),
  SYNOLOGY_BASE_PATH: z.string().optional(),
  SYNOLOGY_DISABLE_SSL_VERIFICATION: z.enum(["true", "false"]).optional(),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional(),
  NAS_URL: z.string().url().optional(),
  RETRY_ATTEMPTS: z.coerce.number().int().min(0).optional(),
  RETRY_DELAY: z.coerce.number().int().min(0).optional(),
}).passthrough();

const env = Object.fromEntries(
  Object.entries(Deno.env.toObject()).map(([key, value]) => [key, value])
);

const result = configSchema.safeParse(env);

if (!result.success) {
  const errors = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
  throw new Error(`Configuration validation error: ${errors}`);
}

const value = result.data;

/**
 * Configuration object containing validated environment variables and default values.
 */
export interface Config {
  /** The username for Synology authentication. */
  synologyUsername?: string;
  /** The password for Synology authentication. */
  synologyPassword: string;
  /** The base path for Synology operations. */
  synologyBasePath?: string;
  /** Whether to disable SSL verification. */
  synologyDisableSslVerification: boolean;
  /** The logging level (error, warn, info, debug). */
  logLevel: string;
  /** The NAS URL for API calls. */
  nasUrl?: string;
  /** Number of retry attempts for API calls. */
  retryAttempts: number;
  /** Delay between retry attempts in milliseconds. */
  retryDelay: number;
}

const config: Config = {
  synologyUsername: value.SYNOLOGY_USERNAME,
  synologyPassword: value.SYNOLOGY_PASSWORD,
  synologyBasePath: value.SYNOLOGY_BASE_PATH,
  synologyDisableSslVerification: value.SYNOLOGY_DISABLE_SSL_VERIFICATION === "true",
  logLevel: value.LOG_LEVEL || "info",
  nasUrl: value.NAS_URL,
  retryAttempts: value.RETRY_ATTEMPTS || 3,
  retryDelay: value.RETRY_DELAY || 1000,
};

export default config;

