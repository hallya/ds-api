import { api } from "./api.ts";
import type {
  Task,
  TaskDetail,
  TaskTransfer,
  ListTasksResponse,
  DeleteTasksResponse,
} from "./types.ts";
import type { ApiInfo } from "./auth.ts";

// Re-export types for convenience
export type { Task, TaskDetail, TaskTransfer, ListTasksResponse, DeleteTasksResponse };

/**
 * Lists all download tasks from the Synology Download Station.
 * @param sid - The session ID for authentication.
 * @param taskVersion - The API version to use (default: "1").
 * @returns A promise that resolves to the API response data.
 */
export async function listTasks(sid: string, taskVersion = "1"): Promise<ListTasksResponse> {
  const { data } = await api("/webapi/DownloadStation/task.cgi", {
    api: "SYNO.DownloadStation.Task",
    version: taskVersion,
    method: "list",
    additional: "detail,transfer",
    _sid: sid,
  });
  return data as ListTasksResponse;
}

/**
 * Removes multiple tasks by their IDs.
 * @param sid - The session ID for authentication.
 * @param idsCsv - Comma-separated list of task IDs to remove.
 * @param forceComplete - Whether to force removal of completed tasks (default: false).
 * @param taskVersion - The API version to use (default: "1").
 * @returns A promise that resolves to the API response data.
 */
export async function removeTasks(
  sid: string,
  idsCsv: string,
  forceComplete = false,
  taskVersion = "1"
): Promise<DeleteTasksResponse> {
  const { data } = await api("/webapi/DownloadStation/task.cgi", {
    api: "SYNO.DownloadStation.Task",
    version: taskVersion,
    method: "delete",
    id: idsCsv,
    force_complete: forceComplete ? "true" : "false",
    _sid: sid,
  });
  return data as DeleteTasksResponse;
}

/**
 * Removes a single task by its ID.
 * @param sid - The session ID for authentication.
 * @param id - The task ID to remove.
 * @param forceComplete - Whether to force removal of completed tasks (default: false).
 * @param taskVersion - The API version to use (default: "1").
 * @returns A promise that resolves to the API response data.
 */
export async function removeTask(
  sid: string,
  id: string,
  forceComplete = false,
  taskVersion = "1"
): Promise<DeleteTasksResponse> {
  const { data } = await api("/webapi/DownloadStation/task.cgi", {
    api: "SYNO.DownloadStation.Task",
    version: taskVersion,
    method: "delete",
    id: id,
    force_complete: forceComplete ? "true" : "false",
    _sid: sid,
  });
  return data as DeleteTasksResponse;
}

/**
 * Determines the appropriate task API version based on server API information.
 * @param info - The API information object retrieved from the server.
 * @returns The API version string to use for task operations.
 */
export function pickTaskVersion(info: ApiInfo): string {
  const task = info["SYNO.DownloadStation.Task"];
  if (task?.maxVersion) return String(task.maxVersion);
  if (task?.version) return String(task.version);
  return "1";
}

/**
 * Sorts tasks by upload amount (ascending) and then by completion time (ascending).
 * @param tasks - Array of task objects to sort.
 * @returns The sorted array of tasks.
 */
export function sortTasksByUploadAndTime(tasks: Task[]): Task[] {
  return tasks.sort((a, b) => {
    const uploadA = a.additional?.transfer?.size_uploaded ?? 0;
    const uploadB = b.additional?.transfer?.size_uploaded ?? 0;
    if (uploadA !== uploadB) {
      return uploadA - uploadB;
    }
    const timeA = a.additional?.detail?.completed_time ?? 0;
    const timeB = b.additional?.detail?.completed_time ?? 0;
    return timeA - timeB;
  });
}

/**
 * Calculates the total size of all tasks in bytes.
 * @param tasks - Array of task objects.
 * @returns The total size in bytes.
 */
export function calculateTotalSize(tasks: Task[]): number {
  return tasks.reduce((total, task) => {
    const taskSize = task.size ?? 0;
    return total + taskSize;
  }, 0);
}

/**
 * Selects tasks for purging based on a maximum size limit.
 * Tasks are selected in order of lowest upload amount and oldest completion time.
 * @param tasks - Array of task objects to evaluate.
 * @param maxSizeGB - The maximum total size in GB to keep.
 * @returns Array of tasks that should be purged.
 */
export function selectTasksForPurge(tasks: Task[], maxSizeGB: number): Task[] {
  const maxSizeBytes = maxSizeGB * 1000 * 1000 * 1000;
  const sortedTasks = sortTasksByUploadAndTime(tasks);

  let currentSize = 0;
  const tasksToPurge: Task[] = [];
  for (const task of sortedTasks) {
    tasksToPurge.push(task);
    currentSize += task.size;

    if (currentSize > maxSizeBytes) {
      break;
    }
  }

  return tasksToPurge;
}

