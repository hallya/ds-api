import { getApiInfo, login, logout, pickAuthVersion, type ApiInfo, type LoginResponse } from "./auth.ts";
import {
  listTasks,
  removeTasks,
  pickTaskVersion,
  sortTasksByUploadAndTime,
  selectTasksForPurge,
  calculateTotalSize,
  type Task,
  type ListTasksResponse,
  type DeleteTasksResponse,
} from "./tasks.ts";
import type { DeleteTaskResult, PurgeResult } from "./types/index.ts";
import logger from "./logger.ts";
import config, { type Config } from "./config.ts";
import { retry } from "./retry.ts";
import { join } from "std/path/mod.ts";

/**
 * Options for SynologyDS constructor (internal type).
 */
export interface SynologyDSOptions {
  baseUrl?: string;
  username?: string;
  password?: string;
  path?: string;
  basePath?: string;
  config?: Config;
}

/**
 * Class for interacting with Synology Download Station API.
 */
export class SynologyDS {
  // Private fields for concurrency protection
  #authenticatePromise: Promise<string> | null = null;
  #getTasksPromise: Promise<Task[]> | null = null;

  baseUrl?: string;
  username?: string;
  password?: string;
  path?: string;
  basePath: string;
  sid: string | null = null;
  apiInfo: ApiInfo | null = null;
  tasksMap: Map<string, Task> = new Map();

  /**
   * Creates a new SynologyDS instance.
   * @param options - Configuration options.
   * @param options.baseUrl - The base URL for the NAS.
   * @param options.username - The username for authentication.
   * @param options.password - The password for authentication.
   * @param options.path - The base path for file operations.
   * @param options.basePath - The base path for validation (defaults to path).
   * @param options.config - Configuration object to inject (for testing). If not provided, uses default config.
   */
  constructor(options: SynologyDSOptions = {}) {
    // Allow injection of config for testing, fallback to default config
    const injectedConfig = options.config || config;

    this.baseUrl = options.baseUrl ?? injectedConfig.nasUrl;
    this.username = options.username ?? injectedConfig.synologyUsername;
    this.password = options.password ?? injectedConfig.synologyPassword;
    this.path = options.path ?? injectedConfig.synologyBasePath;
    this.basePath = options.basePath ?? injectedConfig.synologyBasePath ?? this.path || "";
  }

  /**
   * Initializes the SynologyDS instance by fetching API information.
   * @returns A promise that resolves to the initialized instance.
   */
  async initialize(): Promise<SynologyDS> {
    this.apiInfo = await getApiInfo();
    return this;
  }

  async authenticate(): Promise<string> {
    // If authentication is already in progress, wait for it
    if (this.#authenticatePromise) {
      return this.#authenticatePromise;
    }

    // Create a new authentication promise
    this.#authenticatePromise = (async () => {
      try {
        if (!this.apiInfo) {
          await this.initialize();
        }

        const authVer = pickAuthVersion(this.apiInfo!);
        const resp = await retry(
          async () => {
            return await login(
              this.username!,
              this.password!,
              "DownloadStation",
              authVer
            );
          },
          {
            shouldRetry: (error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : String(error);
              return (
                !errorMessage.includes("invalid credentials") &&
                !errorMessage.includes("Authentication failed")
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
      } finally {
        // Clear the promise lock when done
        this.#authenticatePromise = null;
      }
    })();

    return this.#authenticatePromise;
  }

  async disconnect(): Promise<void> {
    if (this.sid && this.apiInfo) {
      const authVer = pickAuthVersion(this.apiInfo);
      await logout(this.sid, authVer);
      this.sid = null;
    }
  }

  async getTasks(): Promise<Task[]> {
    if (!this.sid) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    // If getTasks is already in progress, wait for it
    if (this.#getTasksPromise) {
      return this.#getTasksPromise;
    }

    // Create a new getTasks promise
    this.#getTasksPromise = (async () => {
      try {
        const taskVersion = pickTaskVersion(this.apiInfo!);
        const response = await retry(async () => {
          return await listTasks(this.sid!, taskVersion);
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
      } finally {
        // Clear the promise lock when done
        this.#getTasksPromise = null;
      }
    })();

    return this.#getTasksPromise;
  }

  async getTasksByUploadAndTime(): Promise<Task[]> {
    const tasks = await this.getTasks();
    return sortTasksByUploadAndTime(tasks);
  }

  /**
   * Removes tasks by their IDs.
   * @param ids - Array of task IDs to remove.
   * @param forceComplete - Whether to force removal of completed tasks (default: false).
   * @returns A promise that resolves to the deletion results.
   * @throws If not authenticated or if the request fails.
   */
  async removeTasksByIds(ids: string[], forceComplete = false): Promise<DeleteTaskResult[]> {
    if (ids.length === 0) {
      throw new Error("No valid task IDs found for the provided titles");
    }

    if (!this.sid) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    logger.debug(`API deletion call for ${ids.length} task(s) (IDs: ${ids.join(", ")})`);

    const taskVersion = pickTaskVersion(this.apiInfo!);
    const response = await retry(async () => {
      return await removeTasks(
        this.sid!,
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

  async purgeTasksBySize(maxSizeGB: number, dryRun = false): Promise<PurgeResult> {
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
   * @param tasksToPurge - Array of tasks that would be purged.
   * @param totalSize - Total size of tasks to purge in bytes.
   */
  logDryRunDetails(tasksToPurge: Task[], totalSize: number): void {
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
   * @param tasksToPurge - Array of tasks that would be purged.
   * @param totalSize - Total size of tasks to purge in bytes.
   * @returns The dry run result object.
   */
  createDryRunResult(tasksToPurge: Task[], totalSize: number): PurgeResult {
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
   * @param tasksToPurge - Array of tasks to delete via API.
   * @returns A promise that resolves to an object with successful and failed deletion results.
   */
  async performApiDeletions(tasksToPurge: Task[]): Promise<{
    successful: DeleteTaskResult[];
    failed: DeleteTaskResult[];
    all: DeleteTaskResult[];
  }> {
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
        const sizeGB = task ? this.#formatSizeGB(task.size) : "N/A";
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
   * @param failedDeletes - Array of failed deletion results.
   */
  logFailedDeletions(failedDeletes: DeleteTaskResult[]): void {
    logger.error(`[Step 1/2] API deletion failures (${failedDeletes.length}):`);
    failedDeletes.forEach((f) => {
      const task = this.tasksMap.get(f.id);
      const taskTitle = task ? task.title : `ID: ${f.id}`;
      const errorCode = f.error || 0;
      logger.error(`  ✗ Failed: "${taskTitle}" (Error code: ${errorCode})`);
    });
  }

  async performSystemDeletions(deleteResults: {
    successful: DeleteTaskResult[];
    failed: DeleteTaskResult[];
    all: DeleteTaskResult[];
  }): Promise<void> {
    const successfulDeletes = deleteResults.successful || [];

    if (successfulDeletes.length === 0) {
      return;
    }

    const successfulTasks = successfulDeletes
      .map((result) => this.tasksMap.get(result.id))
      .filter((task): task is Task => task !== undefined);
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
   * @param pathsToDelete - Array of paths to delete.
   * @param pathToTaskMap - Map of paths to tasks.
   */
  #logSystemDeletionPlan(pathsToDelete: string[], pathToTaskMap: Map<string, Task>): void {
    this.#logPathsList(pathsToDelete, pathToTaskMap, "[Step 2/2]", "Starting system deletion");
  }

  /**
   * Logs the results of system file deletions.
   * @param systemDeleteResults - Array of deletion results from Promise.allSettled.
   * @param pathsToDelete - Array of paths that were deleted.
   * @param pathToTaskMap - Map of paths to tasks.
   */
  #logSystemDeletionResults(
    systemDeleteResults: Array<PromiseSettledResult<string>>,
    pathsToDelete: string[],
    pathToTaskMap: Map<string, Task>
  ): void {
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
      const taskTitle = task ? task.title : "Unknown";

      if (result.status === "fulfilled") {
        logger.info(`  ✓ System deletion successful: "${path}" (Task: "${taskTitle}")`);
      } else {
        logger.error(`  ✗ System deletion failed: "${path}" (Task: "${taskTitle}") - ${result.reason?.message || result.reason}`);
      }
    });
  }

  /**
   * Creates the final result object for purge operations.
   * @param tasksToPurge - Array of tasks that were purged.
   * @param totalSize - Total size of purged tasks in bytes.
   * @param deleteResults - Array of API deletion results.
   * @returns The final purge result object.
   */
  createFinalResult(
    tasksToPurge: Task[],
    totalSize: number,
    deleteResults: DeleteTaskResult[]
  ): PurgeResult {
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
   * @param title - The title of the task to find.
   * @returns A promise that resolves to the task object or null if not found.
   */
  async getTaskByTitle(title: string): Promise<Task | null> {
    const tasks = await this.getTasks();
    return tasks.find((task) => task.title === title) || null;
  }

  /**
   * Retrieves detailed information about a task by its title.
   * @param title - The title of the task to get information about.
   * @returns A promise that resolves to the task object.
   * @throws If the task is not found.
   */
  async getTaskInfo(title: string): Promise<Task> {
    const task = await this.getTaskByTitle(title);
    if (!task) {
      throw new Error(`Task with title "${title}" not found`);
    }
    return task;
  }

  /**
   * Removes tasks by their titles.
   * @param titles - Comma-separated list of task titles to remove.
   * @returns A promise that resolves to the deletion results.
   * @throws If no valid task IDs are found.
   */
  async removeTasksByTitles(titles: string): Promise<DeleteTaskResult[]> {
    const titleList = titles.split(",").map((t) => t.trim());
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
      .filter((id): id is string => id !== null);

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
        logger.error(`  ✗ Failed: "${taskTitle}" (Error code: ${result.error || 0})`);
      });
    }

    return results;
  }

  /**
   * Deletes files from the system using native Deno file system operations.
   * @param paths - Array of file paths to delete.
   * @returns A promise that resolves to an array of deletion results.
   */
  async deleteFromSystem(paths: string[]): Promise<Array<PromiseSettledResult<string>>> {
    const promises = paths.map(async (pathItem): Promise<string> => {
      // Use join() to properly handle path separators
      const fullPath = this.path ? join(this.path, pathItem) : pathItem;
      this.validatePath(fullPath);
      logger.debug(`Deleting file/folder: "${fullPath}"`);

      try {
        await Deno.remove(fullPath, { recursive: true });
        logger.debug(`System deletion successful for: "${fullPath}"`);
        return fullPath;
      } catch (error) {
        logger.error(`Error deleting "${fullPath}": ${error instanceof Error ? error.message : String(error)}`);
        throw new Error(`Failed to delete ${fullPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
    return Promise.allSettled(promises);
  }

  /**
   * Formats bytes to GB with 2 decimal places.
   * Uses decimal (1000-based) conversion instead of binary (1024-based) for consistency
   * with common storage device specifications and user expectations.
   *
   * Note: This uses 1000^3 (1,000,000,000 bytes) per GB, not 1024^3 (1,073,741,824 bytes).
   * This follows the SI (International System of Units) standard where:
   * - 1 GB = 1,000 MB = 1,000,000 KB = 1,000,000,000 bytes
   *
   * This is consistent with how storage manufacturers and most operating systems
   * display storage sizes to users.
   *
   * @param bytes - Size in bytes.
   * @returns Size formatted as GB (decimal, 1000-based).
   */
  #formatSizeGB(bytes: number): string {
    return ((bytes || 0) / (1000 * 1000 * 1000)).toFixed(2);
  }

  /**
   * Filters successful deletion results.
   * @param deleteResults - Array of deletion results.
   * @returns Array of successful deletion results.
   */
  #filterSuccessfulDeletes(deleteResults: DeleteTaskResult[]): DeleteTaskResult[] {
    return deleteResults.filter((result) => result.error === 0);
  }

  /**
   * Filters failed deletion results.
   * @param deleteResults - Array of deletion results.
   * @returns Array of failed deletion results.
   */
  #filterFailedDeletes(deleteResults: DeleteTaskResult[]): DeleteTaskResult[] {
    return deleteResults.filter((result) => result.error !== 0);
  }

  /**
   * Extracts file paths from tasks.
   * @param tasks - Array of task objects.
   * @returns Array of valid file paths.
   */
  #extractPathsFromTasks(tasks: Task[]): string[] {
    return tasks
      .map((task) => task.additional?.detail?.destination)
      .filter((path): path is string => path !== undefined);
  }

  /**
   * Logs a list of tasks with consistent formatting.
   * @param tasks - Array of tasks to log.
   * @param prefix - Prefix for log messages (e.g., "[DRY RUN]" or "[Step 1/2]").
   * @param stepLabel - Label describing the step (e.g., "Simulated API deletion" or "Starting API deletion").
   */
  #logTasksList(tasks: Task[], prefix: string, stepLabel: string): void {
    logger.info(`${prefix} ${stepLabel}: ${tasks.length} task(s) to delete`);
    tasks.forEach((task, index) => {
      const sizeGB = this.#formatSizeGB(task.size);
      logger.info(`  → Task ${index + 1}/${tasks.length}: "${task.title}" (ID: ${task.id}, ${sizeGB} GB)`);
    });
  }

  /**
   * Creates a map from paths to tasks for efficient lookup.
   * @param tasks - Array of task objects.
   * @returns Map of paths to tasks.
   */
  #createPathToTaskMap(tasks: Task[]): Map<string, Task> {
    const map = new Map<string, Task>();
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
   * @param paths - Array of file paths to log.
   * @param pathToTaskMap - Map of paths to tasks for lookup.
   * @param prefix - Prefix for log messages (e.g., "[DRY RUN] [Step 2/2]" or "[Step 2/2]").
   * @param stepLabel - Label describing the step (e.g., "Simulated system deletion" or "Starting system deletion").
   * @param includeFullPath - Whether to include the full path (with this.path prefix).
   */
  #logPathsList(paths: string[], pathToTaskMap: Map<string, Task>, prefix: string, stepLabel: string, includeFullPath = false): void {
    if (paths.length === 0) {
      logger.info(`${prefix} No system files ${includeFullPath ? "would be deleted" : "to delete"} (no destination found)`);
      return;
    }

    logger.info(`${prefix} ${stepLabel}: ${paths.length} file(s)/folder(s) ${includeFullPath ? "would be deleted" : "to delete"}`);
    paths.forEach((pathItem, index) => {
      const task = pathToTaskMap.get(pathItem);
      const taskTitle = task ? task.title : "Unknown";
      const displayPath = includeFullPath && this.path ? join(this.path, pathItem) : pathItem;
      logger.info(`  → File ${index + 1}/${paths.length}: "${displayPath}" (Task: "${taskTitle}")`);
    });
  }

  /**
   * Validates a file path for security and correctness.
   * Uses path resolution to normalize paths and prevent directory traversal attacks.
   * @param fullPath - The full path to validate.
   * @throws If the path fails validation.
   */
  validatePath(fullPath: string): void {
    if (!this.basePath) {
      throw new Error("Base path is not configured");
    }

    const normalizedPath = join(fullPath);
    const normalizedBase = join(this.basePath);

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

