import logger from "@logger";
import type { Task } from "./tasks.ts";

/**
 * Displays a list of download tasks in a formatted manner.
 * @param tasks - Array of task objects to display.
 */
export function displayTasks(tasks: Task[]): void {
  for (const task of tasks) {
    logger.info(
      `${task.id} | ${task.title} | uploaded=${task.additional?.transfer?.size_uploaded ?? 0}`
    );
  }
}

/**
 * Validates the arguments for the remove command.
 * @param titlesArg - Comma-separated list of task titles.
 * @throws If titlesArg is not provided.
 */
export function validateRemoveArgs(titlesArg: string): void {
  if (!titlesArg) {
    throw new Error('Provide titles CSV: ds-torrents remove "title1,title2"');
  }
}

/**
 * Finds task IDs by matching titles against a list of tasks.
 * @param titlesArg - Comma-separated list of task titles.
 * @param tasks - Array of task objects to search in.
 * @returns Array of matching task IDs.
 * @throws If no valid task IDs are found.
 */
export function findTaskIdsByTitles(titlesArg: string, tasks: Task[]): string[] {
  const tasksMap = new Map(tasks.map((task) => [task.title, task]));
  const ids = titlesArg.split(",").map((title) => tasksMap.get(title)?.id).filter(Boolean) as string[];

  if (ids.length === 0) {
    throw new Error("No valid task IDs found for the provided titles");
  }

  return ids;
}

/**
 * Validates the arguments for the purge command.
 * @param sizeArg - The size limit in GB.
 * @returns The parsed size in GB.
 * @throws If sizeArg is not provided or is not a positive number.
 */
export function validatePurgeArgs(sizeArg: string): number {
  if (!sizeArg) {
    throw new Error('Provide size in GB: ds-torrents purge "10.5"');
  }

  const sizeGB = parseFloat(sizeArg);
  if (isNaN(sizeGB) || sizeGB <= 0) {
    throw new Error("Size must be a positive number in GB");
  }

  return sizeGB;
}

/**
 * Validates the arguments for the info command.
 * @param titleArg - The task title.
 * @returns The validated title.
 * @throws If titleArg is not provided.
 */
export function validateInfoArgs(titleArg: string): string {
  if (!titleArg) {
    throw new Error('Provide title: ds-torrents info "torrent_title"');
  }
  return titleArg;
}

/**
 * Formats a number of bytes into a human-readable string.
 * @param bytes - The number of bytes to format.
 * @returns The formatted byte string (e.g., "1.5 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1000; // Use decimal (SI) units instead of binary
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Formats a Unix timestamp into a localized date string.
 * @param timestamp - The Unix timestamp to format.
 * @returns The formatted date string or 'N/A' if timestamp is falsy.
 */
export function formatTimestamp(timestamp: number): string {
  if (!timestamp) return "N/A";
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Displays detailed information about a download task.
 * @param task - The task object containing information to display.
 */
export function displayTaskInfo(task: Task): void {
  logger.info("=== Task Information ===");
  logger.info(`ID: ${task.id}`);
  logger.info(`Title: ${task.title}`);
  logger.info(`Status: ${task.status}`);
  logger.info(`Size: ${formatBytes(task.size)}`);
  logger.info(`Type: ${task.type}`);

  if (task.additional?.detail) {
    const detail = task.additional.detail;
    logger.info("\n=== Details ===");
    logger.info(`Created: ${formatTimestamp(detail.create_time)}`);
    logger.info(`Completed: ${formatTimestamp(detail.completed_time)}`);
    logger.info(`Destination: ${detail.destination}`);
  }

  if (task.additional?.transfer) {
    const transfer = task.additional.transfer;
    logger.info("\n=== Transfer Info ===");
    logger.info(`Downloaded: ${formatBytes(transfer.size_downloaded)}`);
    logger.info(`Uploaded: ${formatBytes(transfer.size_uploaded)}`);
    logger.info(`Ratio: ${transfer.size_downloaded === 0 ? "N/A" : (transfer.size_uploaded / transfer.size_downloaded).toFixed(3)}`);
    logger.info(`Speed Download: ${formatBytes(transfer.speed_download)}/s`);
    logger.info(`Speed Upload: ${formatBytes(transfer.speed_upload)}/s`);
  }

  // Note: file and tracker fields are not in the current Task type but may be present
  const taskAny = task as Task & {
    additional?: {
      file?: Array<{ filename: string; size: number }>;
      tracker?: Array<{ url: string; status: string }>;
      peer?: unknown[];
    };
  };

  if (taskAny.additional?.file) {
    const files = taskAny.additional.file;
    logger.info("\n=== Files ===");
    files.forEach((file, index) => {
      logger.info(`${index + 1}. ${file.filename} (${formatBytes(file.size)})`);
    });
  }

  if (taskAny.additional?.tracker) {
    const trackers = taskAny.additional.tracker;
    logger.info("\n=== Trackers ===");
    trackers.forEach((tracker, index) => {
      logger.info(`${index + 1}. ${tracker.url} (${tracker.status})`);
    });
  }

  if (taskAny.additional?.peer) {
    const peers = taskAny.additional.peer;
    logger.info("\n=== Peers ===");
    logger.info(`Connected: ${Array.isArray(peers) ? peers.length : 0}`);
  }
}

