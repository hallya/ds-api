import { SynologyDS } from "./synology-ds.js";
import {
  displayTasks,
  validateRemoveArgs,
  validatePurgeArgs,
  validateInfoArgs,
  displayTaskInfo,
} from "./cli.js";
import logger from "./logger.js";
import fs from "fs";

/**
 * Handles CLI commands for interacting with Synology Download Station.
 */
export class CLIHandler {
  /**
   * Creates a new CLIHandler instance.
   * @param {Object} [options={}] - Configuration options for the SynologyDS instance.
   * @param {string} [options.baseUrl] - The base URL for the NAS.
   * @param {string} [options.username] - The username for authentication.
   * @param {string} [options.path] - The base path for file operations.
   */
  constructor(options = {}) {
    this.ds = new SynologyDS(options);
    this.isDryRun = true;
    this.isJson = false;
  }

  /**
   * Initializes the CLIHandler by setting up the SynologyDS instance.
   * @returns {Promise<CLIHandler>} A promise that resolves to the initialized CLIHandler instance.
   */
  async initialize() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, "..", "package.json"), "utf8")
    );
    logger.info(`Starting ds-api version ${packageJson.version}`);

    await this.ds.initialize();
    return this;
  }
  /**
   * Sets the dry run mode for operations that support it.
   * @param {boolean} dryRun - Whether to enable dry run mode.
   * @returns {CLIHandler} The CLIHandler instance for chaining.
   */

  /**
   * Sets the JSON output mode for list command.
   * @param {boolean} json - Whether to enable JSON output mode.
   * @returns {CLIHandler} The CLIHandler instance for chaining.
   */
  setJson(json) {
    this.isJson = json;
    return this;
  }

  /**
   * Executes a CLI command based on the action and argument provided.
   * @param {string} action - The command action (list, remove, purge, info).
   * @param {string} [arg] - The argument for the command (if applicable).
   * @returns {Promise<void>} A promise that resolves when the command is executed.
   * @throws {Error} If the action is unknown or an error occurs during execution.
   */
  setDryRun(dryRun) {
    this.isDryRun = dryRun;
    return this;
  }

  async executeCommand(action, arg) {
    try {
      await this.ds.authenticate();

      switch (action) {
        case "list":
          await this.handleList();
          break;
        case "remove":
          await this.handleRemove(arg);
          break;
        case "purge":
          await this.handlePurge(arg);
          break;
        case "info":
          await this.handleInfo(arg);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error(`Error executing command '${action}': ${error.message}`);
      throw error;
    } finally {
      await this.ds.disconnect();
    }
  }

  /**
   * Handles the 'list' command to display all download tasks.
   * @returns {Promise<void>} A promise that resolves when the tasks are displayed.
   */
  async handleList() {
    const tasks = await this.ds.getTasksByUploadAndTime();

    if (tasks.length === 0) {
      if (this.isJson) {
        fs.writeFileSync("torrents.json", JSON.stringify([], null, 2));
        logger.info("Created torrents.json file with empty list.");
      } else {
        logger.info("No torrents found.");
      }
      return;
    }

    if (this.isJson) {
      fs.writeFileSync("torrents.json", JSON.stringify(tasks, null, 2));
      logger.info(`Created torrents.json file with ${tasks.length} task(s).`);
    } else {
      displayTasks(tasks);
    }
  }

  /**
   * Handles the 'remove' command to remove tasks by titles.
   * @param {string} titlesArg - Comma-separated list of task titles to remove.
   * @returns {Promise<void>} A promise that resolves when the removal is requested.
   */
  async handleRemove(titlesArg) {
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
  }

  /**
   * Handles the 'purge' command to remove tasks based on size limit.
   * @param {string} sizeArg - The maximum size in GB for tasks to keep.
   * @returns {Promise<void>} A promise that resolves when the purge operation is complete.
   */
  async handlePurge(sizeArg) {
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
  }

  /**
   * Handles the 'info' command to display detailed information about a specific task.
   * @param {string} titleArg - The title of the task to get information about.
   * @returns {Promise<void>} A promise that resolves when the task information is displayed.
   */
  async handleInfo(titleArg) {
    const title = validateInfoArgs(titleArg);
    const task = await this.ds.getTaskInfo(title);
    displayTaskInfo(task);
    logger.info(`\nTask information displayed for: "${title}"`);
  }
}
