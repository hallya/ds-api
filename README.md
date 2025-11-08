# Synology Download Station API

A Node.js library for interacting with Synology Download Station API.

## Installation

```bash
npm install @hallya/ds-api
```

### Requirements

- Node.js 18+
- Access to a Synology NAS with Download Station package installed
- Valid Synology user credentials with Download Station permissions

### Quick Setup

1. Copy `.env.example` to `.env` and configure your settings:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Synology NAS details:
   ```env
   NAS_URL=https://your-nas-url
   SYNOLOGY_USERNAME=your_username
   SYNOLOGY_PASSWORD=your_password_here
   ```

## Usage

### As a Library

#### Simple API (recommended)

```javascript
import { SynologyDS } from '@hallya/ds-api';

async function example() {
  // Initialize with configuration
  const ds = await new SynologyDS({
    baseUrl: 'https://your-nas-url',
    username: 'your-username',
    password: 'your-password'
  }).initialize();

  // Authenticate with the NAS
  await ds.authenticate();

  // Get all tasks sorted by upload size and completion time
  const tasks = await ds.getTasksByUploadAndTime();
  console.log('Tasks:', tasks);

  // Purge tasks to keep only 10.5 GB total
  const result = await ds.purgeTasksBySize(10.5);
  console.log(result.message);

  // Always disconnect when done
  await ds.disconnect();
}
```

#### Advanced Examples

**Error handling and cleanup:**
```javascript
async function safeExample() {
  let ds;
  try {
    ds = await new SynologyDS({
      baseUrl: 'https://your-nas-url',
      username: 'your-username',
      password: 'your-password'
    }).initialize();

    await ds.authenticate();

    // Your operations here
    const tasks = await ds.getTasks();
    console.log(`Found ${tasks.length} tasks`);

  } catch (error) {
    console.error('Operation failed:', error.message);
  } finally {
    if (ds) {
      await ds.disconnect();
    }
  }
}
```

**Working with specific tasks:**
```javascript
async function taskManagement() {
  const ds = await new SynologyDS({
    baseUrl: 'https://your-nas-url',
    username: 'your-username',
    password: 'your-password'
  }).initialize();

  await ds.authenticate();

  // Get detailed info about a specific task
  const taskInfo = await ds.getTaskInfo('ubuntu-22.04.iso');
  console.log('Task details:', taskInfo);

  // Remove tasks by title
  await ds.removeTasksByTitles('old-movie.avi,expired-document.pdf');

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
} from '@hallya/ds-api';

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

The CLI tool provides several commands for managing your Synology Download Station torrents:

#### Installation

First, install the package globally or run it using npx:

```bash
npm install -g @hallya/ds-api
# or
npx ds-api
```

```

#### Commands

```bash
# List all torrents
ds-api list

# Export torrents to JSON file
ds-api list --json

# Remove torrents by title (comma-separated)
ds-api remove "title1,title2"

# Purge torrents to keep only specified total size (in GB)
# Removes oldest/lowest-ratio torrents until total size is at or below limit
ds-api purge "10.5"

# Dry run purge (simulation - shows what would be deleted)
ds-api purge "10.5" --dry-run

# Show detailed information for a specific torrent
ds-api info "torrent_title"
```

#### Common Use Cases

**Daily cleanup**: Remove torrents when disk space gets low
```bash
ds-api purge "50"  # Purge to keep only 50GB total
```

**Selective removal**: Remove specific completed torrents
```bash
ds-api remove "ubuntu.iso,windows.iso"
```

**Monitor downloads**: Check current download status
```bash
ds-api list
```

**Export data**: Get torrents data in JSON format for scripting
```bash
ds-api list --json  # Creates torrents.json file
```

**Investigate issues**: Get detailed info about a specific torrent
```bash
ds-api info "problematic_torrent"
```

## Configuration

### Environment Variables

- `SYNOLOGY_USERNAME`: Synology username
- `SYNOLOGY_PASSWORD`: Synology password (required)
- `SYNOLOGY_BASE_PATH`: Base path for file operations (default: `/volume1`)
- `SYNOLOGY_DISABLE_SSL_VERIFICATION`: Set to `true` to disable SSL verification (default: `false`)
- `LOG_LEVEL`: Logging level (`error`, `warn`, `info`, `debug`) (default: `info`)
- `NAS_URL`: Synology NAS URL (default: `https://download.lcn-dlc.dev`)
- `RETRY_ATTEMPTS`: Number of retry attempts for API calls (default: `3`)
- `RETRY_DELAY`: Delay between retry attempts in milliseconds (default: `1000`)

### Configuration Options

When using the library programmatically, you can pass configuration options to the `SynologyDS` constructor:

```javascript
const ds = new SynologyDS({
  baseUrl: 'https://your-nas-url',
  username: 'your-username',
  path: '/custom/path'
});
```

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
  - `setJson(json)`: Enable/disable JSON output mode
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

## Troubleshooting

### Common Issues

**Authentication failed**
- Verify your Synology credentials are correct
- Ensure your user has Download Station permissions
- Check that Download Station package is installed and running

**Connection timeout**
- Verify the NAS URL is accessible
- Check network connectivity
- Try increasing `RETRY_ATTEMPTS` or `RETRY_DELAY`

**SSL certificate errors**
- Set `SYNOLOGY_DISABLE_SSL_VERIFICATION=true` for self-signed certificates
- Or configure proper SSL certificates on your NAS

### Debug Mode

Enable debug logging to troubleshoot issues:

```bash
LOG_LEVEL=debug ds-api list
```

Or programmatically:
```javascript
const ds = new SynologyDS({
  // ... other options
  logLevel: 'debug'
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy and configure environment: `cp .env.example .env`
4. Run tests: `npm test` (when tests are added)
5. Run linting: `npm run lint` (when linting is configured)

## License

MIT - see [LICENSE](LICENSE) file for details

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.