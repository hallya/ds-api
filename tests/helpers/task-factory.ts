import { faker } from "@faker-js/faker";
import type {
	Task,
	TaskDetail,
	TaskTransfer,
	TaskStatus,
	TaskType,
} from "../../lib/types/index.ts";

const SECONDS_PER_DAY = 86400;
const BYTES_PER_MB = 1024 * 1024;
const BYTES_PER_GB = 1000 * 1000 * 1000;
const PIECE_SIZE = 1024 * 1024; // 1MB per piece

/**
 * Creates a minimal task detail object with default values (useful for deterministic tests).
 * @param overrides - Optional overrides for specific fields.
 * @returns A TaskDetail object with minimal default values.
 */
export function createMinimalTaskDetail(
	overrides: Partial<TaskDetail> = {},
): TaskDetail {
	return {
		completed_time: 0,
		create_time: 0,
		destination: "",
		seedelapsed: 0,
		started_time: 0,
		total_peers: 0,
		total_pieces: 0,
		unzip_password: "",
		uri: "",
		waiting_seconds: 0,
		connected_leechers: 0,
		connected_peers: 0,
		connected_seeders: 0,
		...overrides,
	};
}

/**
 * Creates a minimal task transfer object with default values (useful for deterministic tests).
 * @param overrides - Optional overrides for specific fields.
 * @returns A TaskTransfer object with minimal default values.
 */
export function createMinimalTaskTransfer(
	overrides: Partial<TaskTransfer> = {},
): TaskTransfer {
	return {
		size_uploaded: 0,
		size_downloaded: 0,
		downloaded_pieces: 0,
		speed_download: 0,
		speed_upload: 0,
		...overrides,
	};
}

/**
 * Creates a realistic task detail object with consistent timestamps.
 * Ensures: create_time <= started_time <= completed_time (when completed_time > 0)
 * @param overrides - Optional overrides for specific fields.
 * @returns A TaskDetail object with realistic and consistent values.
 */
export function createTaskDetail(
	overrides: Partial<TaskDetail> = {},
): TaskDetail {
	const now = Math.floor(Date.now() / 1000);
	const daysAgo = faker.number.int({ min: 1, max: 30 });
	const createTime = overrides.create_time ?? now - SECONDS_PER_DAY * daysAgo;

	let completedTime = overrides.completed_time;
	if (completedTime === undefined) {
		completedTime = 0;
	}

	let startedTime = overrides.started_time;
	if (startedTime === undefined) {
		if (completedTime > 0) {
			const duration = Math.max(0, completedTime - createTime);
			startedTime = createTime + faker.number.int({ min: 0, max: duration });
		} else {
			startedTime = createTime + faker.number.int({ min: 0, max: 50000 });
		}
	}

	// Ensure consistency: create_time <= started_time <= completed_time (if completed)
	const finalCreateTime = Math.min(
		createTime,
		startedTime,
		completedTime > 0 ? completedTime : Infinity,
	);
	const finalStartedTime = Math.max(finalCreateTime, startedTime);
	const finalCompletedTime =
		completedTime > 0
			? Math.max(finalStartedTime, completedTime)
			: completedTime;

	return {
		completed_time: finalCompletedTime,
		connected_leechers:
			overrides.connected_leechers ?? faker.number.int({ min: 0, max: 50 }),
		connected_peers:
			overrides.connected_peers ?? faker.number.int({ min: 0, max: 100 }),
		connected_seeders:
			overrides.connected_seeders ?? faker.number.int({ min: 0, max: 200 }),
		create_time: finalCreateTime,
		destination:
			overrides.destination ??
			faker.helpers.arrayElement([
				"torrents/film",
				"torrents/series",
				"torrents/mangas",
				"downloads",
			]),
		seedelapsed:
			overrides.seedelapsed ?? faker.number.int({ min: 0, max: 1000000 }),
		started_time: finalStartedTime,
		total_peers:
			overrides.total_peers ?? faker.number.int({ min: 0, max: 500 }),
		total_pieces:
			overrides.total_pieces ?? faker.number.int({ min: 100, max: 10000 }),
		unzip_password: overrides.unzip_password ?? faker.internet.password(),
		uri:
			overrides.uri ??
			faker.system.fileName({ extensionCount: 0 }) +
				faker.helpers.arrayElement([".mkv", ".mp4", ".avi", ".zip", ".rar"]),
		waiting_seconds:
			overrides.waiting_seconds ?? faker.number.int({ min: 0, max: 3600 }),
	};
}

/**
 * Creates a realistic task transfer object with consistent sizes.
 * Ensures: size_downloaded <= size, size_uploaded <= size_downloaded (for non-seeding tasks)
 * @param size - Total size of the task in bytes (used to ensure consistency).
 * @param overrides - Optional overrides for specific fields.
 * @param isSeeding - Whether this is a seeding task (allows size_uploaded > size_downloaded).
 * @returns A TaskTransfer object with realistic and consistent values.
 */
export function createTaskTransfer(
	size: number,
	overrides: Partial<TaskTransfer> = {},
	isSeeding = false,
): TaskTransfer {
	// Handle edge case where size is 0 or very small
	const minDownloaded = size === 0 ? 0 : Math.max(1, Math.floor(size * 0.5));
	const sizeDownloaded =
		overrides.size_downloaded ??
		(size === 0
			? 0
			: faker.number.int({
					min: minDownloaded,
					max: size,
				}));

	let sizeUploaded = overrides.size_uploaded;
	if (sizeUploaded === undefined) {
		if (isSeeding) {
			sizeUploaded = faker.number.int({ min: 0, max: sizeDownloaded * 2 });
		} else {
			sizeUploaded = faker.number.int({ min: 0, max: sizeDownloaded });
		}
	}

	const finalSizeDownloaded = Math.min(sizeDownloaded, size);
	const finalSizeUploaded = isSeeding
		? sizeUploaded
		: Math.min(sizeUploaded, finalSizeDownloaded);

	const calculatedPieces = Math.floor(finalSizeDownloaded / PIECE_SIZE);
	const downloadedPieces =
		overrides.downloaded_pieces ??
		faker.number.int({
			min: Math.max(0, calculatedPieces - 10),
			max: calculatedPieces + 10,
		});

	return {
		downloaded_pieces: Math.max(0, downloadedPieces),
		size_downloaded: finalSizeDownloaded,
		size_uploaded: finalSizeUploaded,
		speed_download:
			overrides.speed_download ?? faker.number.int({ min: 0, max: 10000000 }),
		speed_upload:
			overrides.speed_upload ?? faker.number.int({ min: 0, max: 5000000 }),
	};
}

/**
 * Creates a realistic task object.
 * @param overrides - Optional overrides for specific fields.
 * @returns A Task object with realistic values.
 */
export function createTask(overrides: Partial<Task> = {}): Task {
	const id =
		overrides.id ?? `dbid_${faker.number.int({ min: 200, max: 9999 })}`;
	const size =
		overrides.size ?? faker.number.int({ min: 1000000000, max: 10000000000 });
	const status =
		overrides.status ??
		(faker.helpers.arrayElement([
			"finished",
			"seeding",
			"downloading",
			"paused",
			"error",
		]) as TaskStatus);
	const title =
		overrides.title ??
		`${faker.music.songName()} (${faker.date.past({ years: 1 }).getFullYear()}) ${faker.helpers.arrayElement(["MULTi", "FRENCH", "ENGLISH"])} ${faker.helpers.arrayElement(["1080p", "720p", "4K"])} ${faker.helpers.arrayElement(["WEB-DL", "BluRay", "DVDRip"])} ${faker.system.fileExt()}`;
	const type =
		overrides.type ??
		(faker.helpers.arrayElement(["bt", "http", "ftp", "emule"]) as TaskType);
	const username = overrides.username ?? faker.person.firstName();

	const detail =
		overrides.additional?.detail !== undefined
			? overrides.additional.detail
			: (() => {
					const now = Math.floor(Date.now() / 1000);
					const daysAgo = faker.number.int({ min: 1, max: 30 });
					const createTime = now - SECONDS_PER_DAY * daysAgo;

					const completedTime =
						status === "finished" || status === "seeding"
							? createTime +
								faker.number.int({
									min: SECONDS_PER_DAY,
									max: 7 * SECONDS_PER_DAY,
								})
							: 0;

					return createTaskDetail({
						create_time: createTime,
						completed_time: completedTime,
					});
				})();

	const transfer =
		overrides.additional?.transfer !== undefined
			? overrides.additional.transfer
			: createTaskTransfer(size, {}, status === "seeding");

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
 * Creates a task with upload data.
 * Uses createTaskTransfer to generate realistic data while ensuring consistency.
 *
 * @example
 * ```ts
 * // Create a seeding task with 100MB uploaded
 * const task = createTaskWithUpload(100 * 1024 * 1024);
 * ```
 *
 * @param uploadBytes - Amount of data uploaded in bytes.
 * @param overrides - Optional overrides for specific fields.
 * @returns A Task object with upload data.
 */
export function createTaskWithUpload(
	uploadBytes: number,
	overrides: Partial<Task> = {},
): Task {
	const size =
		overrides.size ?? faker.number.int({ min: 1000000000, max: 10000000000 });
	return createTask({
		status: "seeding",
		size,
		additional: {
			transfer: createTaskTransfer(
				size,
				{
					size_uploaded: uploadBytes,
					size_downloaded: size,
					...overrides.additional?.transfer,
				},
				true, // isSeeding
			),
			...overrides.additional,
		},
		...overrides,
	});
}

/**
 * Creates a task with a specific size.
 * Uses createTaskTransfer to generate realistic data while ensuring consistency.
 *
 * @example
 * ```ts
 * // Create a task with exactly 5GB
 * const task = createTaskWithSize(5 * 1000 * 1000 * 1000);
 * ```
 *
 * @param sizeBytes - Size of the task in bytes.
 * @param overrides - Optional overrides for specific fields.
 * @returns A Task object with the specified size.
 */
export function createTaskWithSize(
	sizeBytes: number,
	overrides: Partial<Task> = {},
): Task {
	return createTask({
		size: sizeBytes,
		additional: {
			transfer: createTaskTransfer(sizeBytes, {
				size_downloaded: sizeBytes,
				...overrides.additional?.transfer,
			}),
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
export function createTaskList(
	count: number,
	overrides: Partial<Task> = {},
): Task[] {
	const tasks: Task[] = [];
	for (let i = 0; i < count; i++) {
		tasks.push(
			createTask({
				id: `dbid_${faker.number.int({ min: 200, max: 9999 })}`,
				...overrides,
			}),
		);
	}
	return tasks;
}

/**
 * Creates a large dataset of tasks for testing with deterministic values.
 * Useful for testing performance and correctness with many tasks.
 * @param count - Number of tasks to create (default: 100).
 * @param overrides - Optional overrides applied to all tasks.
 * @returns An array of Task objects with varied but deterministic properties.
 */
export function createLargeTaskDataset(
	count = 100,
	overrides: Partial<Task> = {},
): Task[] {
	const tasks: Task[] = [];

	for (let i = 0; i < count; i++) {
		const sizeGB = (i % 10) + 1;
		const uploadMB = (i % 5) * 0.1;
		const daysAgo = (i % 30) + 1;

		tasks.push(
			createTaskForPurgeTest(sizeGB, uploadMB, daysAgo, {
				id: `task_${i}`,
				...overrides,
			}),
		);
	}

	return tasks;
}

/**
 * Creates a task optimized for purge testing with deterministic values.
 *
 * @example
 * ```ts
 * // Create a 5GB task with 10MB uploaded, completed 3 days ago
 * const task = createTaskForPurgeTest(5, 10, 3);
 * ```
 *
 * @param sizeGB - Size of the task in GB.
 * @param uploadMB - Amount uploaded in MB (default: 0).
 * @param daysAgo - Number of days ago the task was completed (default: 1).
 * @param overrides - Optional overrides for specific fields.
 * @returns A Task object optimized for purge testing.
 */
export function createTaskForPurgeTest(
	sizeGB: number,
	uploadMB: number = 0,
	daysAgo: number = 1,
	overrides: Partial<Task> = {},
): Task {
	const now = Math.floor(Date.now() / 1000);
	const sizeBytes = sizeGB * BYTES_PER_GB;
	const uploadBytes = uploadMB * BYTES_PER_MB;

	return createTask({
		id: overrides.id ?? `task_${sizeGB}gb`,
		size: sizeBytes,
		additional: {
			transfer: createMinimalTaskTransfer({
				size_uploaded: uploadBytes,
				size_downloaded: sizeBytes,
			}),
			detail: createMinimalTaskDetail({
				completed_time: now - SECONDS_PER_DAY * daysAgo,
				create_time: now - SECONDS_PER_DAY * daysAgo * 2,
			}),
			...overrides.additional,
		},
		...overrides,
	});
}

/**
 * Creates a task optimized for sort testing with deterministic values.
 *
 * @example
 * ```ts
 * // Create a task with 100MB uploaded, completed yesterday
 * const yesterday = Math.floor(Date.now() / 1000) - 86400;
 * const task = createTaskForSortTest(100 * 1024 * 1024, yesterday);
 * ```
 *
 * @param uploadBytes - Amount of data uploaded in bytes.
 * @param completedTime - Completion timestamp (Unix epoch).
 * @param overrides - Optional overrides for specific fields.
 * @returns A Task object optimized for sort testing.
 */
export function createTaskForSortTest(
	uploadBytes: number,
	completedTime: number,
	overrides: Partial<Task> = {},
): Task {
	const size =
		overrides.size ?? faker.number.int({ min: 1000000000, max: 10000000000 });
	return createTask({
		status: "seeding",
		size,
		additional: {
			transfer: createMinimalTaskTransfer({
				size_uploaded: uploadBytes,
				size_downloaded: size,
			}),
			detail: createMinimalTaskDetail({
				completed_time: completedTime,
			}),
			...overrides.additional,
		},
		...overrides,
	});
}
