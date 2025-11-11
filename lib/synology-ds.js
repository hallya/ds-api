import { getApiInfo, login, logout, pickAuthVersion } from "./auth.js";
import { rm } from "node:fs/promises";
import path from "node:path";
import {
  listTasks,
  removeTasks,
  pickTaskVersion,
  sortTasksByUploadAndTime,
  selectTasksForPurge,
  calculateTotalSize,
} from "./tasks.js";
import logger from "./logger.js";
import config from "./config.js";
import { retry } from "./retry.js";

/**
 * Class for interacting with Synology Download Station API.
 */
export class SynologyDS {
  /**
   * Creates a new SynologyDS instance.
   * @param {Object} [options={}] - Configuration options.
   * @param {string} [options.baseUrl] - The base URL for the NAS.
   * @param {string} [options.username] - The username for authentication.
   * @param {string} [options.path] - The base path for file operations.
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || config.nasUrl;
    this.username = options.username || config.synologyUsername;
    this.password = config.synologyPassword;
    this.path = options.path || config.synologyBasePath;
    this.basePath = config.synologyBasePath || this.path;
    this.sid = null;
    this.apiInfo = null;
    this.tasksMap = new Map();
  }

  /**
   * Initializes the SynologyDS instance by fetching API information.
   * @returns {Promise<SynologyDS>} A promise that resolves to the initialized instance.
   */
  async initialize() {
    this.apiInfo = await getApiInfo();
    return this;
  }

  async authenticate() {
    if (!this.apiInfo) {
      await this.initialize();
    }

    const authVer = pickAuthVersion(this.apiInfo);
    const resp = await retry(
      async () => {
        return await login(
          this.username,
          this.password,
          "DownloadStation",
          authVer
        );
      },
      {
        shouldRetry: (error) => {
          return (
            !error.message.includes("invalid credentials") &&
            !error.message.includes("Authentication failed")
          );
        },
      }
    );

    if (!resp?.success || !resp?.data?.sid) {
      throw new Error(
        `Authentication failed: invalid credentials or server error (code: ${resp?.error?.code || "unknown"
        })`
      );
    }

    this.sid = resp.data.sid;
    return this.sid;
  }

  async disconnect() {
    if (this.sid && this.apiInfo) {
      const authVer = pickAuthVersion(this.apiInfo);
      await logout(this.sid, authVer);
      this.sid = null;
    }
  }

  async getTasks() {
    if (!this.sid) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    const taskVersion = pickTaskVersion(this.apiInfo);
    const response = await retry(async () => {
      return await listTasks(this.sid, taskVersion);
    });

    if (!response?.success) {
      throw new Error(
        `Failed to retrieve tasks from server: ${response?.error?.code || "unknown error"
        }`
      );
    }

    const tasks = response.data?.tasks || [];
    this.tasksMap = new Map(tasks.map((task) => [task.id, task]));
    return tasks;
  }

  async getTasksByUploadAndTime() {
    const tasks = await this.getTasks();
    return sortTasksByUploadAndTime(tasks);
  }

  /**
   * Removes tasks by their IDs.
   * @param {Array<string>} ids - Array of task IDs to remove.
   * @param {boolean} [forceComplete=false] - Whether to force removal of completed tasks.
   * @returns {Promise<Array<Object>>} A promise that resolves to the deletion results.
   * @throws {Error} If not authenticated or if the request fails.
   */
  async removeTasksByIds(ids, forceComplete = false) {
    if (ids.length === 0) {
      throw new Error("No valid task IDs found for the provided titles");
    }

    if (!this.sid) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    logger.debug(`API deletion call for ${ids.length} task(s) (IDs: ${ids.join(', ')})`);

    const taskVersion = pickTaskVersion(this.apiInfo);
    const response = await retry(async () => {
      return await removeTasks(
        this.sid,
        ids.join(","),
        forceComplete,
        taskVersion
      );
    });

    if (!response?.success) {
      const errorCode = response?.error?.code || "unknown error";
      logger.error(`API deletion call failed (Code: ${errorCode})`);
      throw new Error(
        `Failed to delete tasks: ${errorCode}`
      );
    }

    logger.debug(`API deletion call successful for ${ids.length} task(s)`);
    return response.data || [];
  }

  async purgeTasksBySize(maxSizeGB, dryRun = false) {
    const tasks = await this.getTasks();

    if (tasks.length === 0) {
      return {
        message: "No torrents to purge.",
        tasksToPurge: [],
        totalSize: 0,
      };
    }

    const tasksToPurge = selectTasksForPurge(tasks, maxSizeGB);
    const totalSize = calculateTotalSize(tasksToPurge);

    if (dryRun) {
      this.logDryRunDetails(tasksToPurge, totalSize);
      return this.createDryRunResult(tasksToPurge, totalSize);
    }

    const deleteResults = await this.performApiDeletions(tasksToPurge);
    await this.performSystemDeletions(deleteResults);

    // Use all results for final result (for backward compatibility)
    return this.createFinalResult(tasksToPurge, totalSize, deleteResults.all || deleteResults);
  }

  /**
   * Logs detailed information about what would happen in dry-run mode.
   * @param {Array<Object>} tasksToPurge - Array of tasks that would be purged.
   * @param {number} totalSize - Total size of tasks to purge in bytes.
   */
  logDryRunDetails(tasksToPurge, totalSize) {
    if (tasksToPurge.length === 0) {
      return;
    }

    this.#logTasksList(tasksToPurge, "[DRY RUN] [Step 1/2]", "Simulated API deletion");

    const pathsToDelete = this.#extractPathsFromTasks(tasksToPurge);
    const pathToTaskMap = this.#createPathToTaskMap(tasksToPurge);
    this.#logPathsList(pathsToDelete, pathToTaskMap, "[DRY RUN] [Step 2/2]", "Simulated system deletion", true);

    const totalSizeGB = this.#formatSizeGB(totalSize);
    logger.info(`[DRY RUN] Summary: ${tasksToPurge.length} torrent(s) would be deleted, ${pathsToDelete.length} file(s)/folder(s) would be removed (${totalSizeGB} GB total)`);
  }

  /**
   * Creates a dry run result object for purge operations.
   * @param {Array<Object>} tasksToPurge - Array of tasks that would be purged.
   * @param {number} totalSize - Total size of tasks to purge in bytes.
   * @returns {Object} The dry run result object.
   */
  createDryRunResult(tasksToPurge, totalSize) {
    return {
      message: `[DRY RUN] Simulated purge: ${tasksToPurge.length
        } torrent(s) would be deleted (${this.#formatSizeGB(totalSize)} GB)`,
      tasksToPurge,
      totalSize,
      dryRun: true,
    };
  }

  /**
   * Performs API deletions for the tasks to purge.
   * @param {Array<Object>} tasksToPurge - Array of tasks to delete via API.
   * @returns {Promise<Object>} A promise that resolves to an object with successful and failed deletion results.
   * @property {Array<Object>} successful - Array of successful deletion results.
   * @property {Array<Object>} failed - Array of failed deletion results.
   * @property {Array<Object>} all - Array of all deletion results.
   */
  async performApiDeletions(tasksToPurge) {
    const ids = tasksToPurge.map((task) => task.id);

    this.#logTasksList(tasksToPurge, "[Step 1/2]", "Starting API deletion");

    const deleteResults = await this.removeTasksByIds(ids, true);

    const successfulDeletes = this.#filterSuccessfulDeletes(deleteResults);
    const failedDeletes = this.#filterFailedDeletes(deleteResults);

    logger.info(`[Step 1/2] API deletion completed: ${successfulDeletes.length} successful, ${failedDeletes.length} failed`);

    if (successfulDeletes.length > 0) {
      successfulDeletes.forEach((result) => {
        const task = this.tasksMap.get(result.id);
        const taskTitle = task ? task.title : `ID: ${result.id}`;
        const sizeGB = task ? this.#formatSizeGB(task.size) : 'N/A';
        logger.info(`  ✓ API deletion successful: "${taskTitle}" (${sizeGB} GB)`);
      });
    }

    if (failedDeletes.length > 0) {
      this.logFailedDeletions(failedDeletes);
      logger.warn(`[Step 1/2] ${failedDeletes.length} task deletion(s) failed via API, but continuing with successful deletions`);
    }

    return {
      successful: successfulDeletes,
      failed: failedDeletes,
      all: deleteResults,
    };
  }

  /**
   * Logs information about failed API deletions.
   * @param {Array<Object>} failedDeletes - Array of failed deletion results.
   */
  logFailedDeletions(failedDeletes) {
    logger.error(`[Step 1/2] API deletion failures (${failedDeletes.length}):`);
    failedDeletes.forEach((f) => {
      const task = this.tasksMap.get(f.id);
      const taskTitle = task ? task.title : `ID: ${f.id}`;
      const errorCode = f.error || 'unknown';
      logger.error(`  ✗ Failed: "${taskTitle}" (Error code: ${errorCode})`);
    });
  }

  async performSystemDeletions(deleteResults) {
    // Handle both old format (array) and new format (object with successful/failed)
    const successfulDeletes = Array.isArray(deleteResults)
      ? this.#filterSuccessfulDeletes(deleteResults)
      : deleteResults.successful || [];

    if (successfulDeletes.length === 0) {
      return;
    }

    const successfulTasks = successfulDeletes
      .map((result) => this.tasksMap.get(result.id))
      .filter(Boolean);
    const pathsToDelete = this.#extractPathsFromTasks(successfulTasks);

    if (pathsToDelete.length === 0) {
      logger.info(`[Step 2/2] No system files to delete (no destination found)`);
      return;
    }

    const pathToTaskMap = this.#createPathToTaskMap(successfulTasks);
    this.#logSystemDeletionPlan(pathsToDelete, pathToTaskMap);

    const systemDeleteResults = await this.deleteFromSystem(pathsToDelete);
    this.#logSystemDeletionResults(systemDeleteResults, pathsToDelete, pathToTaskMap);

    const systemFailCount = systemDeleteResults.filter(
      (r) => r.status === "rejected"
    ).length;

    if (systemFailCount > 0) {
      logger.warn(`[Step 2/2] ${systemFailCount} file system deletion(s) failed, but continuing`);
    }
  }

  /**
   * Logs the plan for system file deletions.
   * @param {Array<string>} pathsToDelete - Array of paths to delete.
   * @param {Map<string, Object>} pathToTaskMap - Map of paths to tasks.
   * @private
   */
  #logSystemDeletionPlan(pathsToDelete, pathToTaskMap) {
    this.#logPathsList(pathsToDelete, pathToTaskMap, "[Step 2/2]", "Starting system deletion");
  }

  /**
   * Logs the results of system file deletions.
   * @param {Array<Object>} systemDeleteResults - Array of deletion results from Promise.allSettled.
   * @param {Array<string>} pathsToDelete - Array of paths that were deleted.
   * @param {Map<string, Object>} pathToTaskMap - Map of paths to tasks.
   * @private
   */
  #logSystemDeletionResults(systemDeleteResults, pathsToDelete, pathToTaskMap) {
    const systemSuccessCount = systemDeleteResults.filter(
      (r) => r.status === "fulfilled"
    ).length;
    const systemFailCount = systemDeleteResults.filter(
      (r) => r.status === "rejected"
    ).length;

    logger.info(`[Step 2/2] System deletion completed: ${systemSuccessCount} successful, ${systemFailCount} failed`);

    systemDeleteResults.forEach((result, index) => {
      const path = pathsToDelete[index];
      const task = pathToTaskMap.get(path);
      const taskTitle = task ? task.title : 'Unknown';

      if (result.status === "fulfilled") {
        logger.info(`  ✓ System deletion successful: "${path}" (Task: "${taskTitle}")`);
      } else {
        logger.error(`  ✗ System deletion failed: "${path}" (Task: "${taskTitle}") - ${result.reason?.message || result.reason}`);
      }
    });
  }

  /**
   * Creates the final result object for purge operations.
   * @param {Array<Object>} tasksToPurge - Array of tasks that were purged.
   * @param {number} totalSize - Total size of purged tasks in bytes.
   * @param {Array<Object>} deleteResults - Array of API deletion results.
   * @returns {Object} The final purge result object.
   */
  createFinalResult(tasksToPurge, totalSize, deleteResults) {
    const successfulDeletes = this.#filterSuccessfulDeletes(deleteResults);
    const failedDeletes = this.#filterFailedDeletes(deleteResults);

    const message = failedDeletes.length > 0
      ? `Purge completed with partial success: ${successfulDeletes.length} torrent(s) successfully deleted, ${failedDeletes.length} failure(s) (${this.#formatSizeGB(totalSize)} GB)`
      : `Purge completed: ${successfulDeletes.length} torrent(s) successfully deleted (${this.#formatSizeGB(totalSize)} GB)`;

    return {
      message,
      tasksToPurge,
      totalSize,
      apiDeleteResults: deleteResults,
      successfulCount: successfulDeletes.length,
      failedCount: failedDeletes.length,
    };
  }

  /**
   * Retrieves a task by its title.
   * @param {string} title - The title of the task to find.
   * @returns {Promise<Object|null>} A promise that resolves to the task object or null if not found.
   */
  async getTaskByTitle(title) {
    const tasks = await this.getTasks();
    return tasks.find((task) => task.title === title);
  }

  /**
   * Retrieves detailed information about a task by its title.
   * @param {string} title - The title of the task to get information about.
   * @returns {Promise<Object>} A promise that resolves to the task object.
   * @throws {Error} If the task is not found.
   */
  async getTaskInfo(title) {
    const task = await this.getTaskByTitle(title);
    if (!task) {
      throw new Error(`Task with title "${title}" not found`);
    }
    return task;
  }

  /**
   * Removes tasks by their titles.
   * @param {string} titles - Comma-separated list of task titles to remove.
   * @returns {Promise<Array<Object>>} A promise that resolves to the deletion results.
   * @throws {Error} If no valid task IDs are found.
   */
  async removeTasksByTitles(titles) {
    const titleList = titles.split(",").map(t => t.trim());
    logger.info(`Starting deletion by titles: ${titleList.length} title(s) provided`);

    const tasks = await this.getTasks();
    const ids = titleList
      .map((title) => {
        const task = tasks.find((t) => t.title === title);
        if (task) {
          const sizeGB = this.#formatSizeGB(task.size);
          logger.info(`  → Task found: "${title}" (ID: ${task.id}, ${sizeGB} GB)`);
        } else {
          logger.warn(`  ⚠ Task not found: "${title}"`);
        }
        return task ? task.id : null;
      })
      .filter(Boolean);

    if (ids.length === 0) {
      throw new Error("No valid task IDs found for the provided titles");
    }

    logger.info(`Deleting ${ids.length} task(s) via API`);
    const results = await this.removeTasksByIds(ids, true);

    const successfulDeletes = this.#filterSuccessfulDeletes(results);
    const failedDeletes = this.#filterFailedDeletes(results);

    logger.info(`Deletion completed: ${successfulDeletes.length} successful, ${failedDeletes.length} failed`);

    if (failedDeletes.length > 0) {
      failedDeletes.forEach((result) => {
        const task = this.tasksMap.get(result.id);
        const taskTitle = task ? task.title : `ID: ${result.id}`;
        logger.error(`  ✗ Failed: "${taskTitle}" (Error code: ${result.error || 'unknown'})`);
      });
    }

    return results;
  }

  /**
   * Deletes files from the system using native Node.js file system operations.
   * @param {Array<string>} paths - Array of file paths to delete.
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of deletion results.
   */
  async deleteFromSystem(paths) {
    const promises = paths.map(async (path) => {
      const fullPath = `${this.path}${path}`;
      this.validatePath(fullPath);
      logger.debug(`Deleting file/folder: "${fullPath}"`);
      
      try {
        await rm(fullPath, { recursive: true, force: true });
        logger.debug(`System deletion successful for: "${fullPath}"`);
        return fullPath;
      } catch (error) {
        logger.error(`Error deleting "${fullPath}": ${error.message}`);
        throw new Error(`Failed to delete ${fullPath}: ${error.message}`);
      }
    });
    return Promise.allSettled(promises);
  }

  /**
   * Formats bytes to GB with 2 decimal places.
   * @param {number} bytes - Size in bytes.
   * @returns {string} Size formatted as GB.
   * @private
   */
  #formatSizeGB(bytes) {
    return ((bytes || 0) / (1000 * 1000 * 1000)).toFixed(2);
  }

  /**
   * Filters successful deletion results.
   * @param {Array<Object>} deleteResults - Array of deletion results.
   * @returns {Array<Object>} Array of successful deletion results.
   * @private
   */
  #filterSuccessfulDeletes(deleteResults) {
    return deleteResults.filter((result) => result.error === 0);
  }

  /**
   * Filters failed deletion results.
   * @param {Array<Object>} deleteResults - Array of deletion results.
   * @returns {Array<Object>} Array of failed deletion results.
   * @private
   */
  #filterFailedDeletes(deleteResults) {
    return deleteResults.filter((result) => result.error !== 0);
  }

  /**
   * Extracts file paths from tasks.
   * @param {Array<Object>} tasks - Array of task objects.
   * @returns {Array<string>} Array of valid file paths.
   * @private
   */
  #extractPathsFromTasks(tasks) {
    return tasks
      .map((task) => task.additional?.detail?.destination)
      .filter(Boolean);
  }

  /**
   * Logs a list of tasks with consistent formatting.
   * @param {Array<Object>} tasks - Array of tasks to log.
   * @param {string} prefix - Prefix for log messages (e.g., "[DRY RUN]" or "[Step 1/2]").
   * @param {string} stepLabel - Label describing the step (e.g., "Simulated API deletion" or "Starting API deletion").
   * @private
   */
  #logTasksList(tasks, prefix, stepLabel) {
    logger.info(`${prefix} ${stepLabel}: ${tasks.length} task(s) to delete`);
    tasks.forEach((task, index) => {
      const sizeGB = this.#formatSizeGB(task.size);
      logger.info(`  → Task ${index + 1}/${tasks.length}: "${task.title}" (ID: ${task.id}, ${sizeGB} GB)`);
    });
  }

  /**
   * Creates a map from paths to tasks for efficient lookup.
   * @param {Array<Object>} tasks - Array of task objects.
   * @returns {Map<string, Object>} Map of paths to tasks.
   * @private
   */
  #createPathToTaskMap(tasks) {
    const map = new Map();
    tasks.forEach((task) => {
      const path = task.additional?.detail?.destination;
      if (path) {
        map.set(path, task);
      }
    });
    return map;
  }

  /**
   * Logs a list of file paths with consistent formatting.
   * @param {Array<string>} paths - Array of file paths to log.
   * @param {Map<string, Object>} pathToTaskMap - Map of paths to tasks for lookup.
   * @param {string} prefix - Prefix for log messages (e.g., "[DRY RUN] [Step 2/2]" or "[Step 2/2]").
   * @param {string} stepLabel - Label describing the step (e.g., "Simulated system deletion" or "Starting system deletion").
   * @param {boolean} [includeFullPath=false] - Whether to include the full path (with this.path prefix).
   * @private
   */
  #logPathsList(paths, pathToTaskMap, prefix, stepLabel, includeFullPath = false) {
    if (paths.length === 0) {
      logger.info(`${prefix} No system files ${includeFullPath ? 'would be deleted' : 'to delete'} (no destination found)`);
      return;
    }

    logger.info(`${prefix} ${stepLabel}: ${paths.length} file(s)/folder(s) ${includeFullPath ? 'would be deleted' : 'to delete'}`);
    paths.forEach((path, index) => {
      const task = pathToTaskMap.get(path);
      const taskTitle = task ? task.title : 'Unknown';
      const displayPath = includeFullPath ? `${this.path}${path}` : path;
      logger.info(`  → File ${index + 1}/${paths.length}: "${displayPath}" (Task: "${taskTitle}")`);
    });
  }

  /**
   * Validates a file path for security and correctness.
   * Uses path.resolve() to normalize paths and prevent directory traversal attacks.
   * @param {string} fullPath - The full path to validate.
   * @throws {Error} If the path fails validation.
   */
  validatePath(fullPath) {
    const normalizedPath = path.resolve(fullPath);
    const normalizedBase = path.resolve(this.basePath);
    
    if (!normalizedPath.startsWith(normalizedBase)) {
      throw new Error(
        `Path validation failed: path does not start with expected base directory '${this.basePath}'`
      );
    }
    
    if (fullPath.includes("..")) {
      throw new Error(
        `Path validation failed: path contains '..' which is not allowed`
      );
    }
    
    if (!this.basePath.startsWith("/") && !fullPath.startsWith("/")) {
      throw new Error(`Path validation failed: path is not an absolute path`);
    }
  }
}
