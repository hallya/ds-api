import type {
  Task,
  TaskDetail,
  TaskTransfer,
  TaskStatus,
  TaskType,
} from "../../lib/types.ts";

/**
 * Factory for creating realistic test tasks based on actual torrents.json data.
 */

/**
 * Creates a realistic task detail object.
 * @param overrides - Optional overrides for specific fields.
 * @returns A TaskDetail object with realistic values.
 */
export function createTaskDetail(overrides: Partial<TaskDetail> = {}): TaskDetail {
  const now = Math.floor(Date.now() / 1000);
  const createTime = overrides.create_time ?? now - 86400 * 7; // 7 days ago
  const completedTime = overrides.completed_time ?? (overrides.completed_time === 0 ? 0 : now - 86400 * 2); // 2 days ago or 0

  return {
    completed_time: completedTime,
    connected_leechers: overrides.connected_leechers ?? 0,
    connected_peers: overrides.connected_peers ?? 0,
    connected_seeders: overrides.connected_seeders ?? 0,
    create_time: createTime,
    destination: overrides.destination ?? "torrents/film",
    seedelapsed: overrides.seedelapsed ?? 645475,
    started_time: overrides.started_time ?? createTime + 11823,
    total_peers: overrides.total_peers ?? 0,
    total_pieces: overrides.total_pieces ?? 6910,
    unzip_password: overrides.unzip_password ?? "",
    uri: overrides.uri ?? "example.mkv",
    waiting_seconds: overrides.waiting_seconds ?? 0,
  };
}

/**
 * Creates a realistic task transfer object.
 * @param overrides - Optional overrides for specific fields.
 * @returns A TaskTransfer object with realistic values.
 */
export function createTaskTransfer(overrides: Partial<TaskTransfer> = {}): TaskTransfer {
  const sizeDownloaded = overrides.size_downloaded ?? 7245626681;
  const totalPieces = overrides.downloaded_pieces !== undefined
    ? undefined
    : Math.floor(sizeDownloaded / (1024 * 1024)); // Approximate pieces

  return {
    downloaded_pieces: overrides.downloaded_pieces ?? totalPieces ?? 6910,
    size_downloaded: sizeDownloaded,
    size_uploaded: overrides.size_uploaded ?? 0,
    speed_download: overrides.speed_download ?? 0,
    speed_upload: overrides.speed_upload ?? 0,
  };
}

/**
 * Creates a realistic task object.
 * @param overrides - Optional overrides for specific fields.
 * @returns A Task object with realistic values.
 */
export function createTask(overrides: Partial<Task> = {}): Task {
  const id = overrides.id ?? `dbid_${Math.floor(Math.random() * 1000) + 200}`;
  const size = overrides.size ?? 7245626681;
  const status = overrides.status ?? "finished";
  const title = overrides.title ?? "Example Movie (2023) MULTi 1080p WEB-DL x264.mkv";
  const type = overrides.type ?? "bt";
  const username = overrides.username ?? "Lucien";

  const detail = overrides.additional?.detail !== undefined
    ? overrides.additional.detail
    : createTaskDetail({ completed_time: status === "finished" ? Math.floor(Date.now() / 1000) - 86400 * 2 : 0 });

  const transfer = overrides.additional?.transfer !== undefined
    ? overrides.additional.transfer
    : createTaskTransfer({ size_downloaded: size });

  return {
    id,
    size,
    status: status as TaskStatus,
    title,
    type: type as TaskType,
    username,
    additional: {
      detail: detail,
      transfer: transfer,
      ...overrides.additional,
    },
  };
}

/**
 * Creates a finished task (status: "finished").
 * @param overrides - Optional overrides for specific fields.
 * @returns A finished Task object.
 */
export function createFinishedTask(overrides: Partial<Task> = {}): Task {
  const now = Math.floor(Date.now() / 1000);
  return createTask({
    status: "finished",
    additional: {
      detail: {
        completed_time: now - 86400 * 2, // Completed 2 days ago
        ...overrides.additional?.detail,
      },
      transfer: {
        size_downloaded: overrides.size ?? 7245626681,
        size_uploaded: 0,
        ...overrides.additional?.transfer,
      },
      ...overrides.additional,
    },
    ...overrides,
  });
}

/**
 * Creates a seeding task (status: "seeding").
 * @param overrides - Optional overrides for specific fields.
 * @returns A seeding Task object.
 */
export function createSeedingTask(overrides: Partial<Task> = {}): Task {
  const now = Math.floor(Date.now() / 1000);
  return createTask({
    status: "seeding",
    additional: {
      detail: {
        completed_time: now - 86400, // Completed 1 day ago
        ...overrides.additional?.detail,
      },
      transfer: {
        size_downloaded: overrides.size ?? 2283785213,
        size_uploaded: 0,
        downloaded_pieces: 4357,
        ...overrides.additional?.transfer,
      },
      ...overrides.additional,
    },
    ...overrides,
  });
}

/**
 * Creates a task with upload data.
 * @param uploadBytes - Amount of data uploaded in bytes.
 * @param overrides - Optional overrides for specific fields.
 * @returns A Task object with upload data.
 */
export function createTaskWithUpload(uploadBytes: number, overrides: Partial<Task> = {}): Task {
  return createTask({
    status: "seeding",
    additional: {
      transfer: {
        size_uploaded: uploadBytes,
        size_downloaded: overrides.size ?? 7245626681,
        ...overrides.additional?.transfer,
      },
      ...overrides.additional,
    },
    ...overrides,
  });
}

/**
 * Creates a task with a specific size.
 * @param sizeBytes - Size of the task in bytes.
 * @param overrides - Optional overrides for specific fields.
 * @returns A Task object with the specified size.
 */
export function createTaskWithSize(sizeBytes: number, overrides: Partial<Task> = {}): Task {
  return createTask({
    size: sizeBytes,
    additional: {
      transfer: {
        size_downloaded: sizeBytes,
        ...overrides.additional?.transfer,
      },
      ...overrides.additional,
    },
    ...overrides,
  });
}

/**
 * Creates a list of tasks.
 * @param count - Number of tasks to create.
 * @param overrides - Optional overrides applied to all tasks.
 * @returns An array of Task objects.
 */
export function createTaskList(count: number, overrides: Partial<Task> = {}): Task[] {
  const tasks: Task[] = [];
  for (let i = 0; i < count; i++) {
    tasks.push(createTask({
      id: `dbid_${200 + i}`,
      title: `Task ${i + 1} - Example Movie (202${i % 10}) MULTi 1080p.mkv`,
      size: 1000000000 * (i + 1), // Varying sizes
      ...overrides,
    }));
  }
  return tasks;
}

/**
 * Creates a large dataset of tasks for performance testing.
 * @param count - Number of tasks to create (default: 50).
 * @returns An array of Task objects with varied properties.
 */
export function createLargeDataset(count = 50): Task[] {
  const tasks: Task[] = [];
  const statuses: TaskStatus[] = ["finished", "seeding", "downloading"];
  const types: TaskType[] = ["bt", "http", "ftp"];
  const usernames = ["Lucien", "Valentin", "Victor"];
  const destinations = ["torrents/film", "torrents/series", "torrents/mangas"];

  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < count; i++) {
    const status = statuses[i % statuses.length] as TaskStatus;
    const completedTime = status === "finished" || status === "seeding"
      ? now - (86400 * (i % 30)) // Completed between 0-30 days ago
      : 0;

    tasks.push(createTask({
      id: `dbid_${200 + i}`,
      status,
      type: types[i % types.length] as TaskType,
      username: usernames[i % usernames.length],
      size: Math.floor(Math.random() * 10000000000) + 1000000000, // 1GB to 10GB
      title: `Task ${i + 1} - Example Content ${i + 1} (202${i % 10}) MULTi 1080p.mkv`,
      additional: {
        detail: {
          completed_time: completedTime,
          create_time: now - (86400 * (30 + (i % 60))), // Created 30-90 days ago
          destination: destinations[i % destinations.length],
          total_pieces: Math.floor(Math.random() * 10000) + 100,
        },
        transfer: {
          size_downloaded: Math.floor(Math.random() * 10000000000) + 1000000000,
          size_uploaded: status === "seeding" ? Math.floor(Math.random() * 1000000000) : 0,
          downloaded_pieces: Math.floor(Math.random() * 10000) + 100,
        },
      },
    }));
  }

  return tasks;
}

