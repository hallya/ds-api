import { SynologyDS } from './synology-ds.js';
import { displayTasks, validateRemoveArgs, validatePurgeArgs, validateInfoArgs, displayTaskInfo } from './cli.js';

export class CLIHandler {
  constructor(options = {}) {
    this.ds = new SynologyDS(options);
    this.isDryRun = false;
  }

  async initialize() {
    await this.ds.initialize();
    return this;
  }

  setDryRun(dryRun) {
    this.isDryRun = dryRun;
    return this;
  }

  async executeCommand(action, arg) {
    try {
      await this.ds.authenticate();

      switch (action) {
        case 'list':
          await this.handleList();
          break;
        case 'remove':
          await this.handleRemove(arg);
          break;
        case 'purge':
          await this.handlePurge(arg);
          break;
        case 'info':
          await this.handleInfo(arg);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } finally {
      await this.ds.disconnect();
    }
  }

  async handleList() {
    const tasks = await this.ds.getSortedTasks();

    if (tasks.length === 0) {
      console.log("Aucun torrent.");
      return;
    }

    displayTasks(tasks);
  }

  async handleRemove(titlesArg) {
    validateRemoveArgs(titlesArg);
    const result = await this.ds.removeTasksByTitles(titlesArg);
    console.log("Suppression demandée:", titlesArg);
  }

  async handlePurge(sizeArg) {
    const maxSizeGB = validatePurgeArgs(sizeArg);
    const result = await this.ds.purgeTasksBySize(maxSizeGB, this.isDryRun);

    console.log(result.message);

    if (this.isDryRun && result.tasksToPurge.length > 0) {
      console.log("Tâches qui seraient supprimées:");
      displayTasks(result.tasksToPurge);
    }
  }

  async handleInfo(titleArg) {
    const title = validateInfoArgs(titleArg);
    const task = await this.ds.getTaskInfo(title);
    displayTaskInfo(task);
  }
}