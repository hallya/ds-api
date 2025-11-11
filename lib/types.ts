/**
 * Type definitions for Synology Download Station API.
 * Based on actual API responses from torrents.json and Synology API documentation.
 */

/**
 * Task detail information structure.
 * Contains detailed information about a download task.
 */
export interface TaskDetail {
  /** Unix timestamp when the task was completed (0 if not completed). */
  completed_time: number;
  /** Number of connected leechers. */
  connected_leechers: number;
  /** Number of connected peers. */
  connected_peers: number;
  /** Number of connected seeders. */
  connected_seeders: number;
  /** Unix timestamp when the task was created. */
  create_time: number;
  /** Destination path for the downloaded files. */
  destination: string;
  /** Number of seconds the task has been seeding. */
  seedelapsed: number;
  /** Unix timestamp when the task was started. */
  started_time: number;
  /** Total number of peers. */
  total_peers: number;
  /** Total number of pieces in the torrent. */
  total_pieces: number;
  /** Password for unzipping (if applicable). */
  unzip_password: string;
  /** URI of the task (usually filename or URL). */
  uri: string;
  /** Number of seconds waiting. */
  waiting_seconds: number;
}

/**
 * Task transfer information structure.
 * Contains transfer statistics for a download task.
 */
export interface TaskTransfer {
  /** Number of downloaded pieces. */
  downloaded_pieces: number;
  /** Total size downloaded in bytes. */
  size_downloaded: number;
  /** Total size uploaded in bytes. */
  size_uploaded: number;
  /** Current download speed in bytes per second. */
  speed_download: number;
  /** Current upload speed in bytes per second. */
  speed_upload: number;
}

/**
 * Task file information structure.
 * Contains information about individual files in a task.
 */
export interface TaskFile {
  /** Filename. */
  filename: string;
  /** File size in bytes. */
  size: number;
}

/**
 * Task tracker information structure.
 * Contains information about trackers for a task.
 */
export interface TaskTracker {
  /** Tracker URL. */
  url: string;
  /** Tracker status. */
  status: string;
}

/**
 * Task peer information structure.
 * Contains information about peers for a task.
 */
export interface TaskPeer {
  /** Peer address. */
  address: string;
  /** Peer client. */
  client: string;
  /** Peer progress. */
  progress: number;
  /** Peer speed. */
  speed: number;
}

/**
 * Task additional information structure.
 * Contains optional additional information about a task.
 */
export interface TaskAdditional {
  /** Detailed task information. */
  detail?: TaskDetail;
  /** Transfer statistics. */
  transfer?: TaskTransfer;
  /** File list (if available). */
  file?: TaskFile[];
  /** Tracker list (if available). */
  tracker?: TaskTracker[];
  /** Peer list (if available). */
  peer?: TaskPeer[];
}

/**
 * Task status values.
 */
export type TaskStatus = "waiting" | "downloading" | "paused" | "finishing" | "finished" | "hash_checking" | "seeding" | "filehosting_waiting" | "extracting" | "error";

/**
 * Task type values.
 */
export type TaskType = "bt" | "nzb" | "http" | "ftp" | "emule";

/**
 * Task structure from Synology Download Station API.
 * Represents a single download task.
 */
export interface Task {
  /** Task ID (e.g., "dbid_249"). */
  id: string;
  /** Total size of the task in bytes. */
  size: number;
  /** Task status. */
  status: TaskStatus;
  /** Task title/name. */
  title: string;
  /** Task type. */
  type: TaskType;
  /** Username who created the task. */
  username: string;
  /** Additional task information. */
  additional?: TaskAdditional;
}

/**
 * API information structure for a specific API endpoint.
 */
export interface ApiEndpointInfo {
  /** Maximum supported API version. */
  maxVersion?: number;
  /** Current API version. */
  version?: number;
  /** Minimum supported API version. */
  minVersion?: number;
  /** API path. */
  path?: string;
}

/**
 * API information structure from Synology NAS.
 * Contains information about available APIs and their versions.
 */
export interface ApiInfo {
  /** Authentication API information. */
  "SYNO.API.Auth"?: ApiEndpointInfo;
  /** Download Station Task API information. */
  "SYNO.DownloadStation.Task"?: ApiEndpointInfo;
  /** Additional API endpoints may be present. */
  [key: string]: ApiEndpointInfo | undefined;
}

/**
 * Login response data structure.
 */
export interface LoginResponseData {
  /** Session ID for authenticated requests. */
  sid: string;
  /** Session name. */
  session?: string;
  /** Synology ID (if applicable). */
  synotoken?: string;
}

/**
 * API error structure.
 */
export interface ApiError {
  /** Error code. */
  code: number;
  /** Error message (optional). */
  message?: string;
}

/**
 * Base API response structure.
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful. */
  success: boolean;
  /** Response data (if successful). */
  data?: T;
  /** Error information (if failed). */
  error?: ApiError;
}

/**
 * Login response structure.
 */
export interface LoginResponse extends ApiResponse<LoginResponseData> {}

/**
 * List tasks response structure.
 */
export interface ListTasksResponse extends ApiResponse<{
  /** Array of tasks. */
  tasks?: Task[];
  /** Total number of tasks (if pagination is used). */
  total?: number;
  /** Offset for pagination (if pagination is used). */
  offset?: number;
}> {}

/**
 * Delete task result structure.
 */
export interface DeleteTaskResult {
  /** Task ID that was deleted. */
  id: string;
  /** Error code (0 for success). */
  error: number;
}

/**
 * Delete tasks response structure.
 */
export interface DeleteTasksResponse extends ApiResponse<DeleteTaskResult[]> {}

/**
 * Query API response structure.
 */
export interface QueryApiResponse extends ApiResponse<ApiInfo> {}

