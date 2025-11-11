/**
 * Test setup and utilities for Deno tests.
 * Provides common mocks and configuration for test files.
 */

import * as log from "std/log/mod.ts";

/**
 * Sets up a test logger that suppresses output during tests.
 * This prevents test logs from cluttering the test output.
 */
export function setupTestLogger(): void {
  // Configure logger to use a minimal handler that doesn't output
  log.setup({
    handlers: {
      console: new log.ConsoleHandler("ERROR", {
        formatter: () => "", // Suppress all log output during tests
      }),
    },
    loggers: {
      default: {
        level: "ERROR",
        handlers: ["console"],
      },
    },
  });
}

/**
 * Restores the default logger configuration.
 * Call this in test cleanup if needed.
 */
export function restoreLogger(): void {
  // Reset to default configuration
  log.setup({
    handlers: {
      console: new log.ConsoleHandler("INFO"),
    },
    loggers: {
      default: {
        level: "INFO",
        handlers: ["console"],
      },
    },
  });
}

/**
 * Creates a mock configuration object for testing.
 * @param overrides - Optional overrides for specific config values.
 * @returns A mock config object.
 */
export function createMockConfig(overrides: {
  nasUrl?: string;
  synologyUsername?: string;
  synologyPassword?: string;
  synologyBasePath?: string;
  synologyDisableSslVerification?: boolean;
  logLevel?: string;
  retryAttempts?: number;
  retryDelay?: number;
} = {}) {
  return {
    nasUrl: overrides.nasUrl ?? "https://test-nas.example.com",
    synologyUsername: overrides.synologyUsername ?? "testuser",
    synologyPassword: overrides.synologyPassword ?? "testpass",
    synologyBasePath: overrides.synologyBasePath ?? "/volume1",
    synologyDisableSslVerification: overrides.synologyDisableSslVerification ?? false,
    logLevel: overrides.logLevel ?? "error",
    retryAttempts: overrides.retryAttempts ?? 1,
    retryDelay: overrides.retryDelay ?? 100,
  };
}

/**
 * Waits for a specified number of milliseconds.
 * Useful for testing timeouts and delays.
 * @param ms - Milliseconds to wait.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a temporary directory for testing file operations.
 * Automatically cleans up after the test.
 * @param prefix - Prefix for the temporary directory name.
 * @returns The path to the temporary directory and a cleanup function.
 */
export async function createTempDir(prefix = "ds-api-test-"): Promise<{
  path: string;
  cleanup: () => Promise<void>;
}> {
  const tempDir = await Deno.makeTempDir({ prefix });
  return {
    path: tempDir,
    cleanup: async () => {
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch {
        // Ignore errors during cleanup
      }
    },
  };
}

/**
 * Asserts that a value is defined (not null or undefined).
 * @param value - Value to check.
 * @param message - Optional error message.
 * @throws If value is null or undefined.
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? "Value is null or undefined");
  }
}

