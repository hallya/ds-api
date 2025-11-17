import type { LevelName } from "jsr:@std/log@0.224.0";
import { z } from "npm:zod@^3.23.8";

/**
 * Configuration schema for environment variables validation.
 */
const configSchema = z.object({
  SYNOLOGY_USERNAME: z.string().optional(),
  SYNOLOGY_PASSWORD: z.string().min(1, "SYNOLOGY_PASSWORD is required"),
  SYNOLOGY_BASE_PATH: z.string().optional(),
  SYNOLOGY_DISABLE_SSL_VERIFICATION: z.enum(["true", "false"]).optional(),
  LOG_LEVEL: z.enum(["ERROR", "WARN", "INFO", "DEBUG"]).optional(),
  NAS_URL: z.string().url().optional(),
  RETRY_ATTEMPTS: z.coerce.number().int().min(0).optional(),
  RETRY_DELAY: z.coerce.number().int().min(0).optional(),
}).passthrough();

let validatedConfig: Config | null = null;

function getConfig(): Config {
  if (validatedConfig) {
    return validatedConfig;
  }

  const env = Deno.env.toObject();

  const result = configSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    throw new Error(`\n\nConfiguration validation error: ${errors}\n\n`);
  }

  const value = result.data;

  validatedConfig = {
    synologyUsername: value.SYNOLOGY_USERNAME,
    synologyPassword: value.SYNOLOGY_PASSWORD,
    synologyBasePath: value.SYNOLOGY_BASE_PATH,
    synologyDisableSslVerification: value.SYNOLOGY_DISABLE_SSL_VERIFICATION === "true",
    logLevel: (value.LOG_LEVEL || "INFO") as LevelName,
    nasUrl: value.NAS_URL,
    retryAttempts: value.RETRY_ATTEMPTS || 3,
    retryDelay: value.RETRY_DELAY || 1000,
  };

  return validatedConfig;
}

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
  logLevel: LevelName;
  /** The NAS URL for API calls. */
  nasUrl?: string;
  /** Number of retry attempts for API calls. */
  retryAttempts: number;
  /** Delay between retry attempts in milliseconds. */
  retryDelay: number;
}

const config = new Proxy({} as Config, {
  get(_target, prop) {
    return getConfig()[prop as keyof Config];
  },
});

export default config;

