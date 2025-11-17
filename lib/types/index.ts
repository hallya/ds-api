/**
 * Internal type definitions for the ds-api library.
 * 
 * This module provides:
 * 1. Simplified type aliases for API types (Task instead of ApiTask, etc.)
 * 2. Internal library types that are not part of the API contract (PurgeResult, etc.)
 * 
 * These types are used internally and may differ from or extend the raw API types.
 * For pure API types, see types/api.ts
 */

// Import API types for use in internal types
import type {
  ApiTask,
  ApiDeleteTaskResult,
} from "./api.ts";

// Re-export API types with simplified names for internal use
export type {
  ApiTask as Task,
  ApiTaskDetail as TaskDetail,
  ApiTaskTransfer as TaskTransfer,
  ApiTaskFile as TaskFile,
  ApiTaskTracker as TaskTracker,
  ApiTaskPeer as TaskPeer,
  ApiTaskAdditional as TaskAdditional,
  ApiTaskStatus as TaskStatus,
  ApiTaskType as TaskType,
  ApiInfo,
  ApiEndpointInfo,
  ApiLoginResponseData as LoginResponseData,
  ApiError,
  ApiResponse,
  ApiLoginResponse as LoginResponse,
  ApiListTasksResponse as ListTasksResponse,
  ApiDeleteTaskResult as DeleteTaskResult,
  ApiDeleteTasksResponse as DeleteTasksResponse,
  ApiQueryResponse as QueryApiResponse,
} from "./api.ts";

/**
 * Purge result structure (internal).
 * Result of a purge operation containing information about tasks selected for removal.
 */
export interface PurgeResult {
  /** Human-readable message describing the purge operation result. */
  message: string;
  /** Array of tasks selected for purging. */
  tasksToPurge: ApiTask[];
  /** Total size in bytes of tasks to be purged. */
  totalSize: number;
  /** Whether the purge was performed in dry-run mode (no actual deletion). */
  dryRun?: boolean;
  /** API delete operation results for each task. */
  apiDeleteResults?: ApiDeleteTaskResult[];
  /** Number of successfully deleted tasks. */
  successfulCount?: number;
  /** Number of failed deletions. */
  failedCount?: number;
}

