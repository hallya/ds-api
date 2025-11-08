import { api } from "./api.js";
import { getApiInfo, login, logout, pickAuthVersion } from "./auth.js";
import { exec } from "child_process";
import {
  listTasks,
  removeTasks,
  removeTask,
  pickTaskVersion,
  sortTasksByUploadAndTime,
  selectTasksForPurge,
  calculateTotalSize,
} from "./tasks.js";

export class SynologyDS {
  constructor(options = {}) {
    this.baseUrl =
      options.baseUrl || process.env.NAS_URL || "https://download.lcn-dlc.dev";
    this.username = options.username || process.env.SYNO_USER || "Lucien";
    this.password =
      options.password || process.env.SYNO_PASS || "yah3myu7crw@MGW4met";
    this.path = options.path || process.env.SYNO_PATH || "/volume1";
    this.sid = null;
    this.apiInfo = null;
    this.tasksMap = new Map();
  }

  async initialize() {
    this.apiInfo = await getApiInfo();
    return this;
  }

  async authenticate() {
    if (!this.apiInfo) {
      await this.initialize();
    }

    const authVer = pickAuthVersion(this.apiInfo);
    const resp = await login(
      this.username,
      this.password,
      "DownloadStation",
      authVer
    );

    if (!resp?.success || !resp?.data?.sid) {
      throw new Error(`Login failed: ${resp?.error?.code || "unknown error"}`);
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
    const response = await listTasks(this.sid, taskVersion);

    if (!response?.success) {
      throw new Error("Failed to list tasks");
    }

    const tasks = response.data?.tasks || [];
    this.tasksMap = new Map(tasks.map(task => [task.id, task]));
    return tasks;
  }

  async getTasksByUploadAndTime() {
    const tasks = await this.getTasks();
    return sortTasksByUploadAndTime(tasks);
  }

  async removeTasksByIds(ids, forceComplete = false) {
    if (ids.length === 0) {
      throw new Error("No valid task IDs found for the provided titles");
    }

    if (!this.sid) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    const taskVersion = pickTaskVersion(this.apiInfo);
    const response = await removeTasks(this.sid, ids.join(","), forceComplete, taskVersion);

    if (!response?.success) {
      throw new Error(`Delete failed: ${JSON.stringify(response)}`);
    }

    return response.data || [];
  }

  async purgeTasksBySize(maxSizeGB, dryRun = false) {
    const tasks = await this.getTasks();

    if (tasks.length === 0) {
      return {
        message: "Aucun torrent à purger.",
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

  createDryRunResult(tasksToPurge, totalSize) {
    return {
      message: `[DRY RUN] Purge simulée: ${
        tasksToPurge.length
      } torrent(s) seraient supprimé(s) (${(
        totalSize /
        (1000 * 1000 * 1000)
      ).toFixed(2)} GB)`,
      tasksToPurge,
      totalSize,
      dryRun: true,
    };
  }

  async performApiDeletions(tasksToPurge) {
    const ids = tasksToPurge.map((task) => task.id);
    const deleteResults = await this.removeTasksByIds(ids, true);

    const successfulDeletes = deleteResults.filter(result => result.error === 0);
    const failedDeletes = deleteResults.filter(result => result.error !== 0);

    console.log(`API deletions: ${successfulDeletes.length} successful, ${failedDeletes.length} failed`);

    if (failedDeletes.length > 0) {
      this.logFailedDeletions(failedDeletes);
    }

    return deleteResults;
  }

  logFailedDeletions(failedDeletes) {
    const failedTitles = failedDeletes.map(f => {
      const task = this.tasksMap.get(f.id);
      return task ? task.title : f.id;
    });
    console.log(`Failed API deletions:\n- ${failedTitles.join("\n- ")}`);
  }

  async performSystemDeletions(deleteResults) {
    const successfulDeletes = deleteResults.filter(result => result.error === 0);

    if (successfulDeletes.length > 0) {
      const successfulTasks = successfulDeletes.map(result => this.tasksMap.get(result.id)).filter(Boolean);
      const pathsToDelete = successfulTasks.map(task => task.additional?.detail?.destination).filter(Boolean);
      if (pathsToDelete.length > 0) {
        const systemDeleteResults = await this.deleteFromSystem(pathsToDelete);
        const systemSuccessCount = systemDeleteResults.filter(r => r.status === 'fulfilled').length;
        const systemFailCount = systemDeleteResults.filter(r => r.status === 'rejected').length;
        console.log(`System deletions: ${systemSuccessCount} successful, ${systemFailCount} failed`);
      }
    }
  }

  createFinalResult(tasksToPurge, totalSize, deleteResults) {
    const successfulDeletes = deleteResults.filter(result => result.error === 0);
    const failedDeletes = deleteResults.filter(result => result.error !== 0);

    return {
      message: `Purge effectuée: ${successfulDeletes.length} torrent(s) supprimé(s) avec succès, ${failedDeletes.length} échec(s) (${(totalSize / (1000 * 1000 * 1000)).toFixed(2)} GB)`,
      tasksToPurge,
      totalSize,
      apiDeleteResults: deleteResults,
    };
  }

  async getTaskByTitle(title) {
    const tasks = await this.getTasks();
    return tasks.find((task) => task.title === title);
  }

  async getTaskInfo(title) {
    const task = await this.getTaskByTitle(title);
    if (!task) {
      throw new Error(`Task with title "${title}" not found`);
    }
    return task;
  }

  async removeTasksByTitles(titles) {
    const tasks = await this.getTasks();
    const ids = titles.split(",").map(title => {
      const task = tasks.find(t => t.title === title.trim());
      return task ? task.id : null;
    }).filter(Boolean);

    if (ids.length === 0) {
      throw new Error("No valid task IDs found for the provided titles");
    }

    return await this.removeTasksByIds(ids, true);
  }

  async deleteFromSystem(paths) {
    const promises = paths.map(path => {
      return new Promise((resolve, reject) => {
        const fullPath = `${this.path}${path}`;
        exec(`rm -rf "${fullPath}"`, (error, stdout, stderr) => {
          if (error) {
            console.error(`Failed to delete ${fullPath}: ${error.message}`);
            reject(error);
          } else {
            console.log(`Successfully deleted ${fullPath}`);
            resolve(fullPath);
          }
        });
      });
    });
    return Promise.allSettled(promises);
  }
}
