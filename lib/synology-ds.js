import { api } from "./api.js";
import { getApiInfo, login, logout, pickAuthVersion } from "./auth.js";
import { exec } from "node:child_process";
import {
  listTasks,
  removeTasks,
  removeTask,
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
        `Authentication failed: invalid credentials or server error (code: ${
          resp?.error?.code || "unknown"
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
        `Failed to retrieve tasks from server: ${
          response?.error?.code || "unknown error"
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
      return this.createDryRunResult(tasksToPurge, totalSize);
    }

    const deleteResults = await this.performApiDeletions(tasksToPurge);
    await this.performSystemDeletions(deleteResults);

    return this.createFinalResult(tasksToPurge, totalSize, deleteResults);
  }

  /**
   * Creates a dry run result object for purge operations.
   * @param {Array<Object>} tasksToPurge - Array of tasks that would be purged.
   * @param {number} totalSize - Total size of tasks to purge in bytes.
   * @returns {Object} The dry run result object.
   */
  createDryRunResult(tasksToPurge, totalSize) {
    return {
      message: `[DRY RUN] Simulated purge: ${
        tasksToPurge.length
      } torrent(s) would be deleted (${(
        totalSize /
        (1000 * 1000 * 1000)
      ).toFixed(2)} GB)`,
      tasksToPurge,
      totalSize,
      dryRun: true,
    };
  }

  /**
   * Performs API deletions for the tasks to purge.
   * @param {Array<Object>} tasksToPurge - Array of tasks to delete via API.
   * @returns {Promise<Array<Object>>} A promise that resolves to the deletion results.
   * @throws {Error} If any API deletions fail.
   */
  async performApiDeletions(tasksToPurge) {
    const ids = tasksToPurge.map((task) => task.id);
    
    logger.info(`[Step 1/2] Starting API deletion: ${tasksToPurge.length} task(s) to delete`);
    tasksToPurge.forEach((task, index) => {
      const sizeGB = ((task.size || 0) / (1000 * 1000 * 1000)).toFixed(2);
      logger.info(`  → Task ${index + 1}/${tasksToPurge.length}: "${task.title}" (ID: ${task.id}, ${sizeGB} GB)`);
    });

    const deleteResults = await this.removeTasksByIds(ids, true);

    const successfulDeletes = deleteResults.filter(
      (result) => result.error === 0
    );
    const failedDeletes = deleteResults.filter((result) => result.error !== 0);

    logger.info(`[Step 1/2] API deletion completed: ${successfulDeletes.length} successful, ${failedDeletes.length} failed`);
    
    if (successfulDeletes.length > 0) {
      successfulDeletes.forEach((result) => {
        const task = this.tasksMap.get(result.id);
        const taskTitle = task ? task.title : `ID: ${result.id}`;
        const sizeGB = task ? ((task.size || 0) / (1000 * 1000 * 1000)).toFixed(2) : 'N/A';
        logger.info(`  ✓ API deletion successful: "${taskTitle}" (${sizeGB} GB)`);
      });
    }

    if (failedDeletes.length > 0) {
      this.logFailedDeletions(failedDeletes);
      throw new Error(`${failedDeletes.length} task deletions failed via API`);
    }

    return deleteResults;
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
    const successfulDeletes = deleteResults.filter(
      (result) => result.error === 0
    );

    if (successfulDeletes.length > 0) {
      const successfulTasks = successfulDeletes
        .map((result) => this.tasksMap.get(result.id))
        .filter(Boolean);
      const pathsToDelete = successfulTasks
        .map((task) => task.additional?.detail?.destination)
        .filter(Boolean);
      
      if (pathsToDelete.length > 0) {
        logger.info(`[Step 2/2] Starting system deletion: ${pathsToDelete.length} file(s)/folder(s) to delete`);
        pathsToDelete.forEach((path, index) => {
          const task = successfulTasks.find(t => t.additional?.detail?.destination === path);
          const taskTitle = task ? task.title : 'Unknown';
          logger.info(`  → File ${index + 1}/${pathsToDelete.length}: "${path}" (Task: "${taskTitle}")`);
        });

        const systemDeleteResults = await this.deleteFromSystem(pathsToDelete);
        const systemSuccessCount = systemDeleteResults.filter(
          (r) => r.status === "fulfilled"
        ).length;
        const systemFailCount = systemDeleteResults.filter(
          (r) => r.status === "rejected"
        ).length;

        logger.info(`[Step 2/2] System deletion completed: ${systemSuccessCount} successful, ${systemFailCount} failed`);

        systemDeleteResults.forEach((result, index) => {
          const path = pathsToDelete[index];
          const task = successfulTasks.find(t => t.additional?.detail?.destination === path);
          const taskTitle = task ? task.title : 'Unknown';
          
          if (result.status === "fulfilled") {
            logger.info(`  ✓ System deletion successful: "${path}" (Task: "${taskTitle}")`);
          } else {
            logger.error(`  ✗ System deletion failed: "${path}" (Task: "${taskTitle}") - ${result.reason?.message || result.reason}`);
          }
        });

        if (systemFailCount > 0) {
          throw new Error(`${systemFailCount} file system deletions failed`);
        }
      } else {
        logger.info(`[Step 2/2] No system files to delete (no destination found)`);
      }
    }
  }

  /**
   * Creates the final result object for purge operations.
   * @param {Array<Object>} tasksToPurge - Array of tasks that were purged.
   * @param {number} totalSize - Total size of purged tasks in bytes.
   * @param {Array<Object>} deleteResults - Array of API deletion results.
   * @returns {Object} The final purge result object.
   */
  createFinalResult(tasksToPurge, totalSize, deleteResults) {
    const successfulDeletes = deleteResults.filter(
      (result) => result.error === 0
    );
    const failedDeletes = deleteResults.filter((result) => result.error !== 0);

    return {
      message: `Purge completed: ${
        successfulDeletes.length
      } torrent(s) successfully deleted, ${failedDeletes.length} failure(s) (${(
        totalSize /
        (1000 * 1000 * 1000)
      ).toFixed(2)} GB)`,
      tasksToPurge,
      totalSize,
      apiDeleteResults: deleteResults,
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
          const sizeGB = ((task.size || 0) / (1000 * 1000 * 1000)).toFixed(2);
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
    
    const successfulDeletes = results.filter((result) => result.error === 0);
    const failedDeletes = results.filter((result) => result.error !== 0);
    
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
   * Deletes files from the system using shell commands.
   * @param {Array<string>} paths - Array of file paths to delete.
   * @returns {Promise<Array<Object>>} A promise that resolves to an array of deletion results.
   */
  async deleteFromSystem(paths) {
    const promises = paths.map((path) => {
      return new Promise((resolve, reject) => {
        const fullPath = `${this.path}${path}`;
        this.validatePath(fullPath);
        logger.debug(`Executing system command: rm -rf "${fullPath}"`);
        exec(`rm -rf "${fullPath}"`, (error, stdout, stderr) => {
          if (error) {
            logger.error(`Error deleting "${fullPath}": ${error.message}`);
            if (stderr) {
              logger.error(`  Stderr: ${stderr}`);
            }
            reject(new Error(`Failed to delete ${fullPath}: ${error.message}`));
          } else {
            logger.debug(`System deletion successful for: "${fullPath}"`);
            resolve(fullPath);
          }
        });
      });
    });
    return Promise.allSettled(promises);
  }

  /**
   * Validates a file path for security and correctness.
   * @param {string} fullPath - The full path to validate.
   * @throws {Error} If the path fails validation.
   */
  validatePath(fullPath) {
    if (!fullPath.startsWith(this.basePath)) {
      throw new Error(
        `Path validation failed: path does not start with expected base directory '${this.basePath}'`
      );
    }
    if (fullPath.includes("..")) {
      throw new Error(
        `Path validation failed: path contains '..' which is not allowed`
      );
    }
    if (!fullPath.startsWith("/")) {
      throw new Error(`Path validation failed: path is not an absolute path`);
    }
  }
}
