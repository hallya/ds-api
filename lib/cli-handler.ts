import { dirname } from "std/path";
import { SynologyDS } from "./synology-ds.ts";
import {
  displayTasks,
  validateRemoveArgs,
  validatePurgeArgs,
  validateInfoArgs,
  displayTaskInfo,
} from "./cli.ts";
import logger from "@logger";
import type { ApiTask } from "./types/api.ts";
import { ApiDeleteTaskResult } from "./types/api.ts";
import type { PurgeResult } from "./types/index.ts";

/**
 * Options for CLIHandler constructor.
 * Used to configure the underlying SynologyDS instance.
 */
export interface CLIHandlerOptions {
  /** The base URL for the Synology NAS (e.g., "https://nas.local:5001"). */
  baseUrl?: string;
  /** The username for authentication. */
  username?: string;
  /** The root path for download operations and security validation. */
  downloadRootPath?: string;
}

/**
 * Handles CLI commands for interacting with Synology Download Station.
 */
export class CLIHandler {
  private ds: SynologyDS;
  private isDryRun: boolean;
  private jsonPath?: string;

  /**
   * Creates a new CLIHandler instance.
   * @param options - Configuration options for the SynologyDS instance.
   * @param options.baseUrl - The base URL for the NAS.
   * @param options.username - The username for authentication.
   * @param options.downloadRootPath - The root path for download operations.
   */
  constructor(options: CLIHandlerOptions = {}) {
    this.ds = new SynologyDS({ ...options });
    this.isDryRun = true;
    this.jsonPath = undefined;
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
   * @param jsonPath - Optional path for the JSON file. If not provided, defaults to "torrents.json".
   *                   If path ends with .json, uses it as-is. Otherwise, creates torrents.json in that directory.
   * @returns The CLIHandler instance for chaining.
   */
  setJson(jsonPath?: string): CLIHandler {
    this.jsonPath = jsonPath;
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

    let outputFilePath: string | undefined = undefined;
    if (this.jsonPath !== undefined) {
      if (this.jsonPath === "") {
        outputFilePath = "torrents.json";
      } else if (this.jsonPath.endsWith(".json")) {
        outputFilePath = this.jsonPath;
        const parentDir = dirname(this.jsonPath);
        if (parentDir !== ".") {
          await Deno.mkdir(parentDir, { recursive: true });
        }
      } else {
        await Deno.mkdir(this.jsonPath, { recursive: true });
        outputFilePath = `${this.jsonPath}/torrents.json`;
      }
    }

    if (tasks.length === 0) {
      if (outputFilePath !== undefined) {
        await Deno.writeTextFile(outputFilePath, JSON.stringify([], null, 2));
        logger.info(`Created ${outputFilePath} file with empty list.`);
      } else {
        logger.info("No torrents found.");
      }
      return tasks;
    }

    if (outputFilePath !== undefined) {
      await Deno.writeTextFile(outputFilePath, JSON.stringify(tasks, null, 2));
      logger.info(
        `Created ${outputFilePath} file with ${tasks.length} task(s).`
      );
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

