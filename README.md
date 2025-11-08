# Synology Download Station API

A Node.js library for interacting with Synology Download Station API.

## Installation

```bash
npm install synology-download-station-api
```

## Usage

### As a Library

#### Simple API (recommended)

```javascript
import { SynologyDS } from 'synology-download-station-api';

async function example() {
  const ds = await new SynologyDS({
    baseUrl: 'https://your-nas-url',
    username: 'your-username',
    password: 'your-password'
  }).initialize();

  await ds.authenticate();

  const tasks = await ds.getTasksByUploadAndTime();
  console.log('Tasks:', tasks);

  // Purge tasks by size
  const result = await ds.purgeTasksBySize(10.5); // 10.5 GB
  console.log(result.message);

  await ds.disconnect();
}
```

#### Advanced API (low-level functions)

```javascript
import {
  getApiInfo,
  login,
  listTasks,
  removeTasks,
  logout,
  pickAuthVersion,
  pickTaskVersion
} from 'synology-download-station-api';

async function example() {
  const info = await getApiInfo();
  const authVer = pickAuthVersion(info);
  const taskVer = pickTaskVersion(info);

  const loginResp = await login('username', 'password', 'DownloadStation', authVer);
  const sid = loginResp.data.sid;

  const tasks = await listTasks(sid, taskVer);
  console.log(tasks);

  await logout(sid, authVer);
}
```

### CLI Usage

```bash
# List all torrents
ds-torrents list

# Remove torrents by title
ds-torrents remove "title1,title2"

# Purge torrents by size (in GB)
ds-torrents purge "10.5"

# Dry run purge (simulation)
ds-torrents purge "10.5" --dry-run

# Show detailed info for a specific torrent
ds-torrents info "torrent_title"
```

## Environment Variables

- `NAS_URL`: Synology NAS URL (default: https://download.lcn-dlc.dev)
- `SYNO_USER`: Synology username
- `SYNO_PASS`: Synology password

## API Reference

### Classes

- `SynologyDS`: Main class for interacting with Synology Download Station
  - `constructor(options)`: Create instance with configuration
  - `initialize()`: Initialize API info
  - `authenticate()`: Login to Synology
  - `disconnect()`: Logout and cleanup
  - `getTasks()`: Get all tasks
  - `getTasksByUploadAndTime()`: Get tasks sorted by upload size
  - `removeTasksByIds(ids, forceComplete)`: Remove tasks by IDs
  - `removeTasksByTitles(titles)`: Remove tasks by titles
  - `purgeTasksBySize(maxSizeGB, dryRun)`: Purge tasks by size limit
  - `getTaskByTitle(title)`: Get single task by title
  - `getTaskInfo(title)`: Get detailed task info

- `CLIHandler`: Command-line interface handler
  - `constructor(options)`: Create CLI handler
  - `initialize()`: Initialize handler
  - `setDryRun(dryRun)`: Enable/disable dry-run mode
  - `executeCommand(action, arg)`: Execute CLI command

### Authentication

- `getApiInfo()`: Get API information
- `login(account, passwd, session, version)`: Login to Synology
- `logout(sid, version)`: Logout from Synology
- `pickAuthVersion(info)`: Get appropriate auth API version

### Tasks

- `listTasks(sid, version)`: List download tasks
- `removeTasks(sid, idsCsv, forceComplete, version)`: Remove tasks
- `pickTaskVersion(info)`: Get appropriate task API version
- `sortTasksByUploadAndTime(tasks)`: Sort tasks by upload size and completion time
- `calculateTotalSize(tasks)`: Calculate total file size of tasks
- `selectTasksForPurge(tasks, maxSizeGB)`: Select tasks to purge based on size limit

### CLI Utilities

- `displayTasks(tasks)`: Display formatted task list
- `validateRemoveArgs(titlesArg)`: Validate remove command arguments
- `findTaskIdsByTitles(titlesArg, tasks)`: Find task IDs by titles
- `validatePurgeArgs(sizeArg)`: Validate purge command arguments
- `validateInfoArgs(titleArg)`: Validate info command arguments
- `displayTaskInfo(task)`: Display detailed task information
- `formatBytes(bytes)`: Format bytes to human readable format
- `formatTimestamp(timestamp)`: Format timestamp to readable date

### Task Utilities

- `sortTasksByUploadAndTime(tasks)`: Sort tasks by upload size and completion time
- `calculateTotalSize(tasks)`: Calculate total file size of tasks
- `selectTasksForPurge(tasks, maxSizeGB)`: Select tasks to purge based on cumulative file size

## License

MIT