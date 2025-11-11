import "@test-setup";

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
	sortTasksByUploadAndTime,
	calculateTotalSize,
	selectTasksForPurge,
	pickTaskVersion,
} from "../../../lib/tasks.ts";
import {
	createTask,
	createTaskWithSize,
	createTaskForSortTest,
	createTaskForPurgeTest,
	createMinimalTaskTransfer,
	createLargeTaskDataset,
} from "../../helpers/task-factory.ts";
import type { ApiInfo } from "../../../lib/types/api.ts";

Deno.test("tasks", async (t) => {
	await t.step("sortTasksByUploadAndTime", async (t) => {
		await t.step("sorts by upload then completion time", () => {
			const task1 = createTaskForSortTest(1000, 1000, {
				id: "task1",
				size: 5000,
			});
			const task2 = createTaskForSortTest(500, 2000, {
				id: "task2",
				size: 5000,
			});
			const task3 = createTaskForSortTest(1000, 500, {
				id: "task3",
				size: 5000,
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
					transfer: createMinimalTaskTransfer(),
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

		await t.step("handles large dataset correctly", () => {
			const tasks = createLargeTaskDataset(1000);
			const sorted = sortTasksByUploadAndTime(tasks);

			assertEquals(sorted.length, 1000);

			for (let i = 1; i < sorted.length; i++) {
				const prevUpload =
					sorted[i - 1].additional?.transfer?.size_uploaded ?? 0;
				const currUpload = sorted[i].additional?.transfer?.size_uploaded ?? 0;
				const prevTime = sorted[i - 1].additional?.detail?.completed_time ?? 0;
				const currTime = sorted[i].additional?.detail?.completed_time ?? 0;

				assertEquals(
					prevUpload < currUpload ||
						(prevUpload === currUpload && prevTime <= currTime),
					true,
					`Tasks at index ${i - 1} and ${i} are not correctly sorted`,
				);
			}
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

		await t.step("handles large dataset correctly", () => {
			const tasks = createLargeTaskDataset(500);
			const total = calculateTotalSize(tasks);

			assertEquals(total > 0, true);
			assertEquals(total >= 500 * 1000 * 1000 * 1000, true);
			assertEquals(total <= 500 * 10 * 1000 * 1000 * 1000, true);
		});
	});

	await t.step("selectTasksForPurge", async (t) => {
		await t.step("selects tasks up to size limit", () => {
			const tasks = [
				createTaskForPurgeTest(1, 0.001, 1),
				createTaskForPurgeTest(2, 0.002, 2),
				createTaskForPurgeTest(3, 0.003, 3),
			];

			const selected = selectTasksForPurge(tasks, 2.5);

			assertEquals(selected.length, 2);

			assertEquals(selected[0].size, 1 * 1000 * 1000 * 1000);
			assertEquals(selected[1].size, 2 * 1000 * 1000 * 1000);
		});

		await t.step("respects sort order (lowest upload first)", () => {
			const now = Math.floor(Date.now() / 1000);
			const task1 = createTaskForSortTest(1000, now - 86400, {
				size: 1 * 1000 * 1000 * 1000,
			});
			const task2 = createTaskForSortTest(500, now - 86400, {
				size: 1 * 1000 * 1000 * 1000,
			});
			const task3 = createTaskForSortTest(2000, now - 86400, {
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

		await t.step("handles large dataset correctly", () => {
			const tasks = createLargeTaskDataset(1000);
			const selected = selectTasksForPurge(tasks, 100);

			assertEquals(selected.length > 0, true);
			const totalSize = calculateTotalSize(selected);

			assertEquals(totalSize > 0, true);
			assertEquals(totalSize <= 110 * 1000 * 1000 * 1000, true);

			for (let i = 1; i < selected.length; i++) {
				const prevUpload =
					selected[i - 1].additional?.transfer?.size_uploaded ?? 0;
				const currUpload = selected[i].additional?.transfer?.size_uploaded ?? 0;
				const prevTime =
					selected[i - 1].additional?.detail?.completed_time ?? 0;
				const currTime = selected[i].additional?.detail?.completed_time ?? 0;

				assertEquals(
					prevUpload < currUpload ||
						(prevUpload === currUpload && prevTime <= currTime),
					true,
					`Selected tasks at index ${i - 1} and ${i} are not correctly sorted`,
				);
			}
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
