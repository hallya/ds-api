/**
 * Test helpers for SynologyDS integration tests.
 *
 * Provides reusable functions to reduce duplication in test setup.
 */

import { mockFetch } from "@test-setup";
import { SynologyDS, type SynologyDSOptions } from "../../lib/synology-ds.ts";
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
 * Mocks only the query.cgi endpoint (for initialize tests).
 *
 * @param overrides - Optional override for API info.
 */
export function mockQueryEndpoint(overrides?: {
  apiInfo?: ApiInfo;
}): void {
  const apiInfo = overrides?.apiInfo ?? createApiInfoResponse();

  mockFetch(`${config.nasUrl}/webapi/query.cgi*`, {
    body: JSON.stringify({
      success: true,
      data: apiInfo,
    }),
  });
}

/**
 * Sets up common API mocks for SynologyDS tests.
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
 * Creates and authenticates a SynologyDS instance for testing.
 * Note: This function does NOT set up API mocks. You must call setupApiMocks()
 * or setupPurgeMocks() before calling this function.
 *
 * @param options - Optional SynologyDS options.
 * @returns An authenticated SynologyDS instance.
 */
export async function createAuthenticatedDS(
  options: SynologyDSOptions = {}
): Promise<SynologyDS> {
  const ds = new SynologyDS({
    baseUrl: config.nasUrl,
    username: "test",
    password: "test",
    ...options,
  });
  await ds.initialize();
  await ds.authenticate();
  return ds;
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
 * Sets up all mocks needed for purgeTasksBySize tests.
 * This includes API info, login, task list, and delete responses.
 *
 * @param tasks - Array of tasks to return in the mock response.
 * @param deletedTaskIds - Array of task IDs that were deleted (defaults to all task IDs).
 * @param overrides - Optional overrides for API info and login response.
 */
export function setupPurgeMocks(
  tasks: Task[],
  deletedTaskIds?: string[],
  overrides?: {
    apiInfo?: ApiInfo;
    loginResp?: LoginResponse;
  }
): void {
  setupApiMocks(overrides);
  mockTaskListResponse(tasks);
  const taskIdsToDelete = deletedTaskIds ?? tasks.map((t) => t.id);
  mockDeleteResponse(taskIdsToDelete);
}
