import logger from './logger.js';

/**
 * Displays a list of download tasks in a formatted manner.
 * @param {Array<Object>} tasks - Array of task objects to display.
 */
export function displayTasks(tasks) {
  for (const task of tasks) {
    logger.info(
      `${task.id} | ${task.title} | uploaded=${task.additional?.transfer?.size_uploaded ?? 0}`
    );
  }
}

/**
 * Validates the arguments for the remove command.
 * @param {string} titlesArg - Comma-separated list of task titles.
 * @throws {Error} If titlesArg is not provided.
 */
export function validateRemoveArgs(titlesArg) {
  if (!titlesArg) {
    throw new Error('Provide titles CSV: ds-torrents remove "title1,title2"');
  }
}

/**
 * Finds task IDs by matching titles against a list of tasks.
 * @param {string} titlesArg - Comma-separated list of task titles.
 * @param {Array<Object>} tasks - Array of task objects to search in.
 * @returns {Array<string>} Array of matching task IDs.
 * @throws {Error} If no valid task IDs are found.
 */
export function findTaskIdsByTitles(titlesArg, tasks) {
  const tasksMap = new Map(tasks.map((task) => [task.title, task]));
  const ids = titlesArg.split(",").map((title) => tasksMap.get(title)?.id).filter(Boolean);

  if (ids.length === 0) {
    throw new Error("No valid task IDs found for the provided titles");
  }

  return ids;
}

/**
 * Validates the arguments for the purge command.
 * @param {string} sizeArg - The size limit in GB.
 * @returns {number} The parsed size in GB.
 * @throws {Error} If sizeArg is not provided or is not a positive number.
 */
export function validatePurgeArgs(sizeArg) {
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
 * @param {string} titleArg - The task title.
 * @returns {string} The validated title.
 * @throws {Error} If titleArg is not provided.
 */
export function validateInfoArgs(titleArg) {
  if (!titleArg) {
    throw new Error('Provide title: ds-torrents info "torrent_title"');
  }
  return titleArg;
}

/**
 * Formats a number of bytes into a human-readable string.
 * @param {number} bytes - The number of bytes to format.
 * @returns {string} The formatted byte string (e.g., "1.5 MB").
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1000; // Use decimal (SI) units instead of binary
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats a Unix timestamp into a localized date string.
 * @param {number} timestamp - The Unix timestamp to format.
 * @returns {string} The formatted date string or 'N/A' if timestamp is falsy.
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Displays detailed information about a download task.
 * @param {Object} task - The task object containing information to display.
 */
export function displayTaskInfo(task) {
  logger.info('=== Task Information ===');
  logger.info(`ID: ${task.id}`);
  logger.info(`Title: ${task.title}`);
  logger.info(`Status: ${task.status}`);
  logger.info(`Size: ${formatBytes(task.size)}`);
  logger.info(`Type: ${task.type}`);

  if (task.additional?.detail) {
    const detail = task.additional.detail;
    logger.info('\n=== Details ===');
    logger.info(`Created: ${formatTimestamp(detail.created_time)}`);
    logger.info(`Completed: ${formatTimestamp(detail.completed_time)}`);
    logger.info(`Priority: ${detail.priority}`);
    logger.info(`Destination: ${detail.destination}`);
  }

  if (task.additional?.transfer) {
    const transfer = task.additional.transfer;
    logger.info('\n=== Transfer Info ===');
    logger.info(`Downloaded: ${formatBytes(transfer.size_downloaded)}`);
    logger.info(`Uploaded: ${formatBytes(transfer.size_uploaded)}`);
    logger.info(`Ratio: ${transfer.size_downloaded === 0 ? 'N/A' : (transfer.size_uploaded / transfer.size_downloaded).toFixed(3)}`);
    logger.info(`Speed Download: ${formatBytes(transfer.speed_download)}/s`);
    logger.info(`Speed Upload: ${formatBytes(transfer.speed_upload)}/s`);
  }

  if (task.additional?.file) {
    const files = task.additional.file;
    logger.info('\n=== Files ===');
    files.forEach((file, index) => {
      logger.info(`${index + 1}. ${file.filename} (${formatBytes(file.size)})`);
    });
  }

  if (task.additional?.tracker) {
    const trackers = task.additional.tracker;
    logger.info('\n=== Trackers ===');
    trackers.forEach((tracker, index) => {
      logger.info(`${index + 1}. ${tracker.url} (${tracker.status})`);
    });
  }

  if (task.additional?.peer) {
    const peers = task.additional.peer;
    logger.info('\n=== Peers ===');
    logger.info(`Connected: ${peers.length}`);
  }
}