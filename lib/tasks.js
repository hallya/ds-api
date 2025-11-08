import { api } from './api.js';

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

export function pickTaskVersion(info) {
  const task = info["SYNO.DownloadStation.Task"];
  if (task?.maxVersion) return String(task.maxVersion);
  if (task?.version) return String(task.version);
  return "1";
}

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

export function calculateTotalSize(tasks) {
  return tasks.reduce((total, task) => {
    // Use task.size for actual file size
    const taskSize = task.size ?? 0;
    return total + taskSize;
  }, 0);
}

export function selectTasksForPurge(tasks, maxSizeGB) {
  const maxSizeBytes = maxSizeGB * 1000 * 1000 * 1000; // Convert GB to bytes using decimal units
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