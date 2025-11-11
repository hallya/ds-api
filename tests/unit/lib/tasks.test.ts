import {
	assertEquals,
	assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
	sortTasksByUploadAndTime,
	calculateTotalSize,
	selectTasksForPurge,
	pickTaskVersion,
} from "../../../lib/tasks.ts";
import {
	createTask,
	createTaskList,
	createTaskWithUpload,
	createTaskWithSize,
	createFinishedTask,
	createTaskDetail,
	createTaskTransfer,
} from "../../helpers/task-factory.ts";
import type { ApiInfo } from "../../../lib/types/api.ts";
import { setupTestLogger } from "../../helpers/setup.ts";

setupTestLogger();

Deno.test("tasks", async (t) => {
	await t.step("sortTasksByUploadAndTime", async (t) => {
		await t.step("sorts by upload then completion time", () => {
			const task1 = createTaskWithUpload(1000, {
				id: "task1",
				additional: {
					detail: {
						completed_time: 1000,
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
					},
					transfer: {
						size_uploaded: 1000,
						size_downloaded: 5000,
						downloaded_pieces: 0,
						speed_download: 0,
						speed_upload: 0,
					},
				},
			});
			const task2 = createTaskWithUpload(500, {
				id: "task2",
				additional: {
					detail: {
						completed_time: 2000,
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
					},
					transfer: {
						size_uploaded: 500,
						size_downloaded: 5000,
						downloaded_pieces: 0,
						speed_download: 0,
						speed_upload: 0,
					},
				},
			});
			const task3 = createTaskWithUpload(1000, {
				id: "task3",
				additional: {
					detail: {
						completed_time: 500,
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
					},
					transfer: {
						size_uploaded: 1000,
						size_downloaded: 5000,
						downloaded_pieces: 0,
						speed_download: 0,
						speed_upload: 0,
					},
				},
			});

			const tasks = [task1, task2, task3];
			const sorted = sortTasksByUploadAndTime(tasks);

			assertEquals(sorted[0].id, "task2");
			assertEquals(sorted[1].id, "task3");
			assertEquals(sorted[2].id, "task1");
		});

		await t.step("handles missing upload/time gracefully", () => {
			const task1 = createTask({
				id: "task1",
				additional: {
					transfer: {
						size_uploaded: 0,
						size_downloaded: 0,
						downloaded_pieces: 0,
						speed_download: 0,
						speed_upload: 0,
					},
				},
			});
			const task2 = createTask({
				id: "task2",
				additional: undefined,
			});

			const tasks = [task1, task2];
			const sorted = sortTasksByUploadAndTime(tasks);

			assertEquals(sorted.length, 2);
		});
	});

	await t.step("calculateTotalSize", async (t) => {
		await t.step("sums all task sizes", () => {
			const tasks = [
				createTaskWithSize(1000),
				createTaskWithSize(2000),
				createTaskWithSize(3000),
			];

			const total = calculateTotalSize(tasks);

			assertEquals(total, 6000);
		});

		await t.step("handles empty array", () => {
			const total = calculateTotalSize([]);

			assertEquals(total, 0);
		});

		await t.step("handles missing size", () => {
			const task = createTask({ size: 0 });
			const total = calculateTotalSize([task]);

			assertEquals(total, 0);
		});
	});

	await t.step("selectTasksForPurge", async (t) => {
		await t.step("selects tasks up to size limit", () => {
			const tasks = [
				createTaskWithSize(1 * 1000 * 1000 * 1000),
				createTaskWithSize(2 * 1000 * 1000 * 1000),
				createTaskWithSize(3 * 1000 * 1000 * 1000),
			];

			const selected = selectTasksForPurge(tasks, 2.5);

			assertEquals(selected.length, 2);
			assertEquals(selected[0].size, 1 * 1000 * 1000 * 1000);
			assertEquals(selected[1].size, 2 * 1000 * 1000 * 1000);
		});

		await t.step("respects sort order (lowest upload first)", () => {
			const task1 = createTaskWithUpload(1000, {
				size: 1 * 1000 * 1000 * 1000,
			});
			const task2 = createTaskWithUpload(500, { size: 1 * 1000 * 1000 * 1000 });
			const task3 = createTaskWithUpload(2000, {
				size: 1 * 1000 * 1000 * 1000,
			});

			const tasks = [task1, task2, task3];
			const selected = selectTasksForPurge(tasks, 2.5);

			assertEquals(selected.length, 3);
			assertEquals(selected[0].additional?.transfer?.size_uploaded, 500);
			assertEquals(selected[1].additional?.transfer?.size_uploaded, 1000);
			assertEquals(selected[2].additional?.transfer?.size_uploaded, 2000);
		});

		await t.step("returns empty array if no tasks", () => {
			const selected = selectTasksForPurge([], 10);

			assertEquals(selected.length, 0);
		});
	});

	await t.step("pickTaskVersion", async (t) => {
		await t.step("uses maxVersion if available", () => {
			const info: ApiInfo = {
				"SYNO.DownloadStation.Task": {
					maxVersion: 2,
					version: 1,
				},
			};

			const version = pickTaskVersion(info);

			assertEquals(version, "2");
		});

		await t.step("falls back to version if maxVersion not available", () => {
			const info: ApiInfo = {
				"SYNO.DownloadStation.Task": {
					version: 1,
				},
			};

			const version = pickTaskVersion(info);

			assertEquals(version, "1");
		});

		await t.step("defaults to '1' if no version info", () => {
			const info: ApiInfo = {};

			const version = pickTaskVersion(info);

			assertEquals(version, "1");
		});

		await t.step("handles missing task API info", () => {
			const info: ApiInfo = {
				"SYNO.API.Auth": {
					version: 7,
				},
			};

			const version = pickTaskVersion(info);

			assertEquals(version, "1");
		});
	});
});
