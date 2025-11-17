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

// ============================================================================
// 1. Environment Variables Setup
// ============================================================================

try {
	await load({ envPath: ".env.test", export: true });
} catch {
	throw new Error("Failed to load .env.test file");
}

// Set LOG_LEVEL to SILENT for tests to suppress all log output
Deno.env.set("LOG_LEVEL", "SILENT");

// ============================================================================
// 3. Global Fetch Mock Setup
// ============================================================================

export { mockFetch, resetFetch };

Deno.test.afterEach(() => {
	resetFetch();
});

