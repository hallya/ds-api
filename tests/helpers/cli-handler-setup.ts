/**
 * Test helpers for CLIHandler integration tests.
 *
 * Provides reusable functions to reduce duplication in test setup.
 */

import { assertEquals } from "std/assert";
import { mockFetch } from "@test-setup";
import { CLIHandler, type CLIHandlerOptions } from "../../lib/cli-handler.ts";
import {
  createApiInfoResponse,
  createLoginResponse,
  createTasksListResponse,
  createDeleteResponse,
} from "./api-response-factory.ts";
import type { ApiInfo, LoginResponse, Task } from "../../lib/types/index.ts";
import config from "../../lib/config.ts";

/**
 * Gets the NAS URL from config (from .env.test in tests).
 */
if (!config.nasUrl) {
  throw new Error("NAS_URL is not configured in .env.test");
}

/**
 * Sets up common API mocks for CLIHandler tests.
 * Mocks the query.cgi and auth.cgi endpoints.
 *
 * @param overrides - Optional overrides for API info and login response.
 */
export function setupApiMocks(overrides?: {
  apiInfo?: ApiInfo;
  loginResp?: LoginResponse;
}): void {
  const apiInfo = overrides?.apiInfo ?? createApiInfoResponse();
  const loginResp =
    overrides?.loginResp ?? createLoginResponse("test-session-id");

  mockFetch(`${config.nasUrl}/webapi/query.cgi*`, {
    body: JSON.stringify({
      success: true,
      data: apiInfo,
    }),
  });

  mockFetch(`${config.nasUrl}/webapi/auth.cgi*`, {
    body: JSON.stringify(loginResp),
  });
}

/**
 * Creates and authenticates a CLIHandler instance for testing.
 *
 * @param options - Optional CLIHandler options.
 * @returns An authenticated CLIHandler instance.
 */
export async function createAuthenticatedHandler(
  options: CLIHandlerOptions = {}
): Promise<CLIHandler> {
  setupApiMocks();
  const handler = new CLIHandler({
    baseUrl: config.nasUrl,
    username: "test",
    ...options,
  });
  // @ts-expect-error - accessing private property for testing
  await handler.ds.authenticate();
  return handler;
}

/**
 * Mocks the task list API endpoint response.
 *
 * @param tasks - Array of tasks to return in the mock response.
 */
export function mockTaskListResponse(tasks: Task[]): void {
  const tasksResponse = createTasksListResponse(tasks);
  mockFetch(`${config.nasUrl}/webapi/DownloadStation/task.cgi*`, {
    body: JSON.stringify(tasksResponse),
  });
}

/**
 * Mocks the delete task API endpoint response.
 *
 * @param taskIds - Array of task IDs that were deleted.
 */
export function mockDeleteResponse(taskIds: string[]): void {
  const deleteResp = createDeleteResponse(taskIds);
  mockFetch(`${config.nasUrl}/webapi/DownloadStation/task.cgi*`, {
    body: JSON.stringify(deleteResp),
  });
}

/**
 * Asserts that a JSON file exists and contains the expected tasks.
 *
 * @param filePath - Path to the JSON file to verify.
 * @param expectedCount - Expected number of tasks in the file.
 * @returns The parsed tasks array.
 */
export async function assertJsonFile(
  filePath: string,
  expectedCount: number,
): Promise<Task[]> {
  const jsonContent = await Deno.readTextFile(filePath);
  const parsed = JSON.parse(jsonContent);
  assertEquals(Array.isArray(parsed), true, "JSON file should contain an array");
  assertEquals(parsed.length, expectedCount, `JSON file should contain ${expectedCount} task(s)`);
  return parsed;
}
