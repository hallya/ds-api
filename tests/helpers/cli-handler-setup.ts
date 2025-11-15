/**
 * Test helpers for CLIHandler integration tests.
 *
 * Provides reusable functions to reduce duplication in test setup.
 */

import { mockFetch } from "@test-setup";
import {
  CLIHandler,
  type CLIHandlerOptions,
} from "../../lib/cli-handler.ts";
import {
  createApiInfoResponse,
  createLoginResponse,
  createTasksListResponse,
} from "./api-response-factory.ts";
import type { ApiInfo, LoginResponse, Task } from "../../lib/types/index.ts";

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
  const loginResp = overrides?.loginResp ??
    createLoginResponse("test-session-id");

  mockFetch("https://example.com/webapi/query.cgi*", {
    body: JSON.stringify({
      success: true,
      data: apiInfo,
    }),
  });

  mockFetch("https://example.com/webapi/auth.cgi*", {
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
  options: CLIHandlerOptions = {},
): Promise<CLIHandler> {
  setupApiMocks();
  const handler = new CLIHandler({
    baseUrl: "https://example.com",
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
  mockFetch("https://example.com/webapi/DownloadStation/task.cgi*", {
    body: JSON.stringify(tasksResponse),
  });
}
