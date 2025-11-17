import { SynologyDS } from "./synology-ds.ts";
import {
  displayTasks,
  validateRemoveArgs,
  validatePurgeArgs,
  validateInfoArgs,
  displayTaskInfo,
} from "./cli.ts";
import logger from "./logger.ts";
import type { ApiTask } from "./types/api.ts";
import { ApiDeleteTaskResult } from "./types/api.ts";
import type { PurgeResult } from "./types/index.ts";

/**
 * Options for CLIHandler constructor.
 */
export interface CLIHandlerOptions {
  baseUrl?: string;
  username?: string;
  path?: string;
}

/**
 * Handles CLI commands for interacting with Synology Download Station.
 */
export class CLIHandler {
  private ds: SynologyDS;
  private isDryRun: boolean;
  private isJson: boolean;

  /**
   * Creates a new CLIHandler instance.
   * @param options - Configuration options for the SynologyDS instance.
   * @param options.baseUrl - The base URL for the NAS.
   * @param options.username - The username for authentication.
   * @param options.path - The base path for file operations.
   */
  constructor(options: CLIHandlerOptions = {}) {
    this.ds = new SynologyDS({ ...options, basePath: options.path });
    this.isDryRun = true;
    this.isJson = false;
  }

  /**
   * Initializes the CLIHandler by setting up the SynologyDS instance.
   * @returns A promise that resolves to the initialized CLIHandler instance.
   */
  async initialize(): Promise<CLIHandler> {
    try {
      let version: string | undefined;
      try {
        const jsrJsonText = await Deno.readTextFile("jsr.json");
        const jsrJson = JSON.parse(jsrJsonText);
        version = jsrJson.version;
      } catch {
        const denoJsonText = await Deno.readTextFile("deno.json");
        const denoJson = JSON.parse(denoJsonText);
        version = denoJson.version;
      }
      if (version) {
        logger.info(`Starting ds-api version ${version}`);
      }
    } catch {
      logger.info("Starting ds-api");
    }

    await this.ds.initialize();
    return this;
  }

  /**
   * Sets the dry run mode for operations that support it.
   * @param dryRun - Whether to enable dry run mode.
   * @returns The CLIHandler instance for chaining.
   */
  setDryRun(dryRun: boolean): CLIHandler {
    this.isDryRun = dryRun;
    return this;
  }

  /**
   * Sets the JSON output mode for list command.
   * @param json - Whether to enable JSON output mode.
   * @returns The CLIHandler instance for chaining.
   */
  setJson(json: boolean): CLIHandler {
    this.isJson = json;
    return this;
  }

  /**
   * Executes a CLI command based on the action and argument provided.
   * @param action - The command action (list, remove, purge, info).
   * @param arg - The argument for the command (if applicable).
   * @returns A promise that resolves when the command is executed.
   * @throws If the action is unknown or an error occurs during execution.
   */
  async executeCommand(action: string, arg?: string): Promise<void> {
    try {
      await this.ds.authenticate();

      switch (action) {
        case "list":
          await this.handleList();
          break;
        case "remove":
          await this.handleRemove(arg || "");
          break;
        case "purge":
          await this.handlePurge(arg || "");
          break;
        case "info":
          await this.handleInfo(arg || "");
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error executing command '${action}': ${errorMessage}`);
      throw error;
    } finally {
      await this.ds.disconnect();
    }
  }

  /**
   * Handles the 'list' command to display all download tasks.
   * @returns A promise that resolves when the tasks are displayed.
   */
  async handleList(): Promise<ApiTask[]> {
    const tasks = await this.ds.getTasksByUploadAndTime();

    if (tasks.length === 0) {
      if (this.isJson) {
        await Deno.writeTextFile("torrents.json", JSON.stringify([], null, 2));
        logger.info("Created torrents.json file with empty list.");
      } else {
        logger.info("No torrents found.");
      }
      return tasks;
    }

    if (this.isJson) {
      await Deno.writeTextFile("torrents.json", JSON.stringify(tasks, null, 2));
      logger.info(`Created torrents.json file with ${tasks.length} task(s).`);
    } else {
      displayTasks(tasks);
    }

    return tasks;
  }

  /**
   * Handles the 'remove' command to remove tasks by titles.
   * @param titlesArg - Comma-separated list of task titles to remove.
   * @returns A promise that resolves when the removal is requested.
   */
  async handleRemove(titlesArg: string): Promise<ApiDeleteTaskResult[]> {
    validateRemoveArgs(titlesArg);
    const result = await this.ds.removeTasksByTitles(titlesArg);

    const successfulDeletes = result.filter((r) => r.error === 0);
    const failedDeletes = result.filter((r) => r.error !== 0);

    if (successfulDeletes.length > 0) {
      logger.info(`✓ 'remove' command completed successfully: ${successfulDeletes.length} task(s) deleted`);
    }
    if (failedDeletes.length > 0) {
      logger.warn(`⚠ 'remove' command completed with ${failedDeletes.length} failure(s)`);
    }

    return result;
  }

  /**
   * Handles the 'purge' command to remove tasks based on size limit.
   * @param sizeArg - The maximum size in GB for tasks to keep.
   * @returns A promise that resolves when the purge operation is complete.
   */
  async handlePurge(sizeArg: string): Promise<PurgeResult> {
    const maxSizeGB = validatePurgeArgs(sizeArg);

    if (this.isDryRun) {
      logger.info(`[DRY-RUN MODE] Simulating purge with limit of ${maxSizeGB} GB`);
    } else {
      logger.info(`[REAL MODE] Starting purge with limit of ${maxSizeGB} GB`);
    }

    const result = await this.ds.purgeTasksBySize(maxSizeGB, this.isDryRun);

    logger.info(result.message);
    if (!this.isDryRun) {
      logger.info(`✓ 'purge' command completed`);
    }
    return result;
  }

  /**
   * Handles the 'info' command to display detailed information about a specific task.
   * @param titleArg - The title of the task to get information about.
   * @returns A promise that resolves when the task information is displayed.
   */
  async handleInfo(titleArg: string): Promise<ApiTask> {
    const title = validateInfoArgs(titleArg);
    const task = await this.ds.getTaskInfo(title);
    displayTaskInfo(task);
    logger.info(`\nTask information displayed for: "${title}"`);
    return task;
  }
}

