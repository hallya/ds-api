import type {
  ApiInfo,
  ApiEndpointInfo,
  LoginResponse,
  LoginResponseData,
  ListTasksResponse,
  DeleteTasksResponse,
  DeleteTaskResult,
  Task,
} from "../../lib/types.ts";
import { createTaskList } from "./task-factory.ts";

/**
 * Factory for creating realistic API response objects for testing.
 */

/**
 * Creates a realistic API info response.
 * @param overrides - Optional overrides for specific fields.
 * @returns An ApiInfo object with realistic values.
 */
export function createApiInfoResponse(overrides: Partial<ApiInfo> = {}): ApiInfo {
  return {
    "SYNO.API.Auth": {
      maxVersion: 7,
      version: 7,
      minVersion: 1,
      path: "auth.cgi",
      ...overrides["SYNO.API.Auth"],
    },
    "SYNO.DownloadStation.Task": {
      maxVersion: 2,
      version: 2,
      minVersion: 1,
      path: "DownloadStation/task.cgi",
      ...overrides["SYNO.DownloadStation.Task"],
    },
    ...overrides,
  };
}

/**
 * Creates a successful login response.
 * @param sid - Session ID (default: generated).
 * @param overrides - Optional overrides for specific fields.
 * @returns A LoginResponse object with success status.
 */
export function createLoginResponse(sid?: string, overrides: Partial<LoginResponse> = {}): LoginResponse {
  const sessionId = sid ?? `session_${Math.random().toString(36).substring(2, 15)}`;
  return {
    success: true,
    data: {
      sid: sessionId,
      session: "DownloadStation",
      ...overrides.data,
    },
    ...overrides,
  };
}

/**
 * Creates a failed login response.
 * @param errorCode - Error code (default: 400).
 * @param overrides - Optional overrides for specific fields.
 * @returns A LoginResponse object with failure status.
 */
export function createFailedLoginResponse(errorCode = 400, overrides: Partial<LoginResponse> = {}): LoginResponse {
  return {
    success: false,
    error: {
      code: errorCode,
      message: "Invalid credentials",
      ...overrides.error,
    },
    ...overrides,
  };
}

/**
 * Creates a successful tasks list response.
 * @param tasks - Array of tasks to include (default: empty array).
 * @param overrides - Optional overrides for specific fields.
 * @returns A ListTasksResponse object with success status.
 */
export function createTasksListResponse(tasks: Task[] = [], overrides: Partial<ListTasksResponse> = {}): ListTasksResponse {
  return {
    success: true,
    data: {
      tasks: tasks.length > 0 ? tasks : [],
      total: tasks.length,
      offset: 0,
      ...overrides.data,
    },
    ...overrides,
  };
}

/**
 * Creates a failed tasks list response.
 * @param errorCode - Error code (default: 500).
 * @param overrides - Optional overrides for specific fields.
 * @returns A ListTasksResponse object with failure status.
 */
export function createFailedTasksListResponse(errorCode = 500, overrides: Partial<ListTasksResponse> = {}): ListTasksResponse {
  return {
    success: false,
    error: {
      code: errorCode,
      message: "Failed to retrieve tasks",
      ...overrides.error,
    },
    ...overrides,
  };
}

/**
 * Creates a successful delete response.
 * @param taskIds - Array of task IDs that were deleted.
 * @param overrides - Optional overrides for specific fields.
 * @returns A DeleteTasksResponse object with success status.
 */
export function createDeleteResponse(taskIds: string[], overrides: Partial<DeleteTasksResponse> = {}): DeleteTasksResponse {
  const results: DeleteTaskResult[] = taskIds.map((id) => ({
    id,
    error: 0, // Success
  }));

  return {
    success: true,
    data: results,
    ...overrides,
  };
}

/**
 * Creates a partial delete response (some succeeded, some failed).
 * @param successfulIds - Array of task IDs that were successfully deleted.
 * @param failedIds - Array of task IDs that failed to delete.
 * @param overrides - Optional overrides for specific fields.
 * @returns A DeleteTasksResponse object with mixed results.
 */
export function createPartialDeleteResponse(
  successfulIds: string[],
  failedIds: Array<{ id: string; errorCode: number }>,
  overrides: Partial<DeleteTasksResponse> = {}
): DeleteTasksResponse {
  const results: DeleteTaskResult[] = [
    ...successfulIds.map((id) => ({ id, error: 0 })),
    ...failedIds.map(({ id, errorCode }) => ({ id, error: errorCode })),
  ];

  return {
    success: true, // Overall success, but some individual deletions failed
    data: results,
    ...overrides,
  };
}

/**
 * Creates a failed delete response.
 * @param errorCode - Error code (default: 500).
 * @param overrides - Optional overrides for specific fields.
 * @returns A DeleteTasksResponse object with failure status.
 */
export function createFailedDeleteResponse(errorCode = 500, overrides: Partial<DeleteTasksResponse> = {}): DeleteTasksResponse {
  return {
    success: false,
    error: {
      code: errorCode,
      message: "Failed to delete tasks",
      ...overrides.error,
    },
    ...overrides,
  };
}

/**
 * Creates a response with a list of tasks using the task factory.
 * @param count - Number of tasks to generate.
 * @param overrides - Optional overrides for the response.
 * @returns A ListTasksResponse with generated tasks.
 */
export function createTasksListResponseWithFactory(count: number, overrides: Partial<ListTasksResponse> = {}): ListTasksResponse {
  const tasks = createTaskList(count);
  return createTasksListResponse(tasks, overrides);
}

