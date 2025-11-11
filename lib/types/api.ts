/**
 * Type definitions for Synology Download Station API responses.
 * 
 * IMPORTANT: These types correspond EXACTLY to the JSON structures returned by the Synology API.
 * They are prefixed with "Api" to distinguish them from internal library types.
 * 
 * These types should match the API contract and should not be modified unless the API changes.
 * Based on actual API responses from torrents.json and Synology API documentation.
 * 
 * For internal library types, see types/index.ts
 */

/**
 * Task detail information structure from API.
 * Contains detailed information about a download task.
 */
export interface ApiTaskDetail {
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
 * Task transfer information structure from API.
 * Contains transfer statistics for a download task.
 */
export interface ApiTaskTransfer {
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
 * Task file information structure from API.
 * Contains information about individual files in a task.
 */
export interface ApiTaskFile {
  /** Filename. */
  filename: string;
  /** File size in bytes. */
  size: number;
}

/**
 * Task tracker information structure from API.
 * Contains information about trackers for a task.
 */
export interface ApiTaskTracker {
  /** Tracker URL. */
  url: string;
  /** Tracker status. */
  status: string;
}

/**
 * Task peer information structure from API.
 * Contains information about peers for a task.
 */
export interface ApiTaskPeer {
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
 * Task additional information structure from API.
 * Contains optional additional information about a task.
 */
export interface ApiTaskAdditional {
  /** Detailed task information. */
  detail?: ApiTaskDetail;
  /** Transfer statistics. */
  transfer?: ApiTaskTransfer;
  /** File list (if available). */
  file?: ApiTaskFile[];
  /** Tracker list (if available). */
  tracker?: ApiTaskTracker[];
  /** Peer list (if available). */
  peer?: ApiTaskPeer[];
}

/**
 * Task status values from API.
 */
export type ApiTaskStatus = "waiting" | "downloading" | "paused" | "finishing" | "finished" | "hash_checking" | "seeding" | "filehosting_waiting" | "extracting" | "error";

/**
 * Task type values from API.
 */
export type ApiTaskType = "bt" | "nzb" | "http" | "ftp" | "emule";

/**
 * Task structure from Synology Download Station API.
 * Represents a single download task as returned by the API.
 */
export interface ApiTask {
  /** Task ID (e.g., "dbid_249"). */
  id: string;
  /** Total size of the task in bytes. */
  size: number;
  /** Task status. */
  status: ApiTaskStatus;
  /** Task title/name. */
  title: string;
  /** Task type. */
  type: ApiTaskType;
  /** Username who created the task. */
  username: string;
  /** Additional task information. */
  additional?: ApiTaskAdditional;
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
 * Login response data structure from API.
 */
export interface ApiLoginResponseData {
  /** Session ID for authenticated requests. */
  sid: string;
  /** Session name. */
  session?: string;
  /** Synology ID (if applicable). */
  synotoken?: string;
}

/**
 * API error structure from API responses.
 */
export interface ApiError {
  /** Error code. */
  code: number;
  /** Error message (optional). */
  message?: string;
}

/**
 * Base API response structure.
 * All API responses follow this structure.
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
 * Login response structure from API.
 */
export interface ApiLoginResponse extends ApiResponse<ApiLoginResponseData> {}

/**
 * List tasks response structure from API.
 */
export interface ApiListTasksResponse extends ApiResponse<{
  /** Array of tasks. */
  tasks?: ApiTask[];
  /** Total number of tasks (if pagination is used). */
  total?: number;
  /** Offset for pagination (if pagination is used). */
  offset?: number;
}> {}

/**
 * Delete task result structure from API.
 */
export interface ApiDeleteTaskResult {
  /** Task ID that was deleted. */
  id: string;
  /** Error code (0 for success). */
  error: number;
}

/**
 * Delete tasks response structure from API.
 */
export interface ApiDeleteTasksResponse extends ApiResponse<ApiDeleteTaskResult[]> {}

/**
 * Query API response structure from API.
 */
export interface ApiQueryResponse extends ApiResponse<ApiInfo> {}

