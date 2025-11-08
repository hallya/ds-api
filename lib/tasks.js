import { api } from './api.js';

/**
 * Lists all download tasks from the Synology Download Station.
 * @param {string} sid - The session ID for authentication.
 * @param {string} [taskVersion="1"] - The API version to use.
 * @returns {Promise<Object>} A promise that resolves to the API response data.
 */
export async function listTasks(sid, taskVersion = "1") {
  const { data } = await api("/webapi/DownloadStation/task.cgi", {
    api: "SYNO.DownloadStation.Task",
    version: taskVersion,
    method: "list",
    additional: "detail,transfer",
    _sid: sid,
  });
  return data;
}

/**
 * Removes multiple tasks by their IDs.
 * @param {string} sid - The session ID for authentication.
 * @param {string} idsCsv - Comma-separated list of task IDs to remove.
 * @param {boolean} [forceComplete=false] - Whether to force removal of completed tasks.
 * @param {string} [taskVersion="1"] - The API version to use.
 * @returns {Promise<Object>} A promise that resolves to the API response data.
 */
export async function removeTasks(
  sid,
  idsCsv,
  forceComplete = false,
  taskVersion = "1"
) {
  const { data } = await api("/webapi/DownloadStation/task.cgi", {
    api: "SYNO.DownloadStation.Task",
    version: taskVersion,
    method: "delete",
    id: idsCsv,
    force_complete: forceComplete ? "true" : "false",
    _sid: sid,
  });
  return data;
}

/**
 * Removes a single task by its ID.
 * @param {string} sid - The session ID for authentication.
 * @param {string} id - The task ID to remove.
 * @param {boolean} [forceComplete=false] - Whether to force removal of completed tasks.
 * @param {string} [taskVersion="1"] - The API version to use.
 * @returns {Promise<Object>} A promise that resolves to the API response data.
*/
export async function removeTask(
  sid,
  id,
  forceComplete = false,
  taskVersion = "1"
) {
  const { data } = await api("/webapi/DownloadStation/task.cgi", {
    api: "SYNO.DownloadStation.Task",
    version: taskVersion,
    method: "delete",
    id: id,
    force_complete: forceComplete ? "true" : "false",
    _sid: sid,
  });
  return data;
}

/**
 * Determines the appropriate task API version based on server API information.
 * @param {Object} info - The API information object retrieved from the server.
 * @returns {string} The API version string to use for task operations.
*/
export function pickTaskVersion(info) {
  const task = info["SYNO.DownloadStation.Task"];
  if (task?.maxVersion) return String(task.maxVersion);
  if (task?.version) return String(task.version);
  return "1";
}

/**
 * Sorts tasks by upload amount (ascending) and then by completion time (ascending).
 * @param {Array<Object>} tasks - Array of task objects to sort.
 * @returns {Array<Object>} The sorted array of tasks.
*/
export function sortTasksByUploadAndTime(tasks) {
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
 * @param {Array<Object>} tasks - Array of task objects.
 * @returns {number} The total size in bytes.
*/
export function calculateTotalSize(tasks) {
  return tasks.reduce((total, task) => {
    const taskSize = task.size ?? 0;
    return total + taskSize;
  }, 0);
}

/**
 * Selects tasks for purging based on a maximum size limit.
 * Tasks are selected in order of lowest upload amount and oldest completion time.
 * @param {Array<Object>} tasks - Array of task objects to evaluate.
 * @param {number} maxSizeGB - The maximum total size in GB to keep.
 * @returns {Array<Object>} Array of tasks that should be purged.
*/
export function selectTasksForPurge(tasks, maxSizeGB) {
  const maxSizeBytes = maxSizeGB * 1000 * 1000 * 1000;
  const sortedTasks = sortTasksByUploadAndTime(tasks);
  
  let currentSize = 0;
  const tasksToPurge = [];
  for (const task of sortedTasks) {
    tasksToPurge.push(task);
    currentSize += task.size;
    
    if (currentSize > maxSizeBytes) {
      break;
    }
  }
  
  return tasksToPurge;
}