/**
 * Test setup - MUST be imported FIRST in all test files.
 * 
 * This file:
 * 1. Sets up test environment variables (with normalization)
 * 2. Configures the test logger
 * 3. Sets up a global fetch mock that fails with clear error messages
 * 
 * Import this file once at the top of each test file using the import map alias:
 * ```ts
 * import "@test-setup";
 * ```
 * 
 * Note: Deno doesn't support automatic test setup files like Jest. This import
 * is required in each test file, but the import map makes it shorter and standardized.
 */

import { mockFetch, resetFetch } from "@mock-fetch";
import { load } from "std/dotenv";
import * as log from "std/log";

// ============================================================================
// 1. Environment Variables Setup
// ============================================================================

try {
	await load({ envPath: ".env.test", export: true });
} catch {
	throw new Error("Failed to load .env.test file");
}

// ============================================================================
// 2. Logger Setup
// ============================================================================

await log.setup({
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

// ============================================================================
// 3. Global Fetch Mock Setup
// ============================================================================

export { mockFetch, resetFetch };

Deno.test.afterEach(() => {
	resetFetch();
});

