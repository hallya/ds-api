/**
 * Integration tests for lib/synology-ds.ts with HTTP mocks.
 *
 * These tests verify that the SynologyDS class works correctly
 * with different scenarios by mocking API calls.
 */

import "@test-setup";

import {
	assertEquals,
	assertRejects,
} from "std/assert";
import { mockFetch } from "@test-setup";
import { SynologyDS } from "../../../lib/synology-ds.ts";
import {
	createApiInfoResponse,
	createLoginResponse,
	createTasksListResponse,
	createDeleteResponse,
} from "../../helpers/api-response-factory.ts";
import {
	createTaskList,
	createTaskForPurgeTest,
} from "../../helpers/task-factory.ts";

Deno.test("synology-ds", async (t) => {
	await t.step("initialize", async () => {
		mockFetch("https://example.com/webapi/query.cgi*", {
			body: JSON.stringify({
				success: true,
				data: createApiInfoResponse(),
			}),
		});

		const ds = new SynologyDS({
			baseUrl: "https://example.com",
			username: "test",
			password: "test",
		});

		await ds.initialize();

		assertEquals(ds.apiInfo !== null, true);
		assertEquals(ds.apiInfo?.["SYNO.API.Auth"] !== undefined, true);
	});

	await t.step("authenticate", async () => {
		const apiInfo = createApiInfoResponse();
		const loginResp = createLoginResponse("test-session-id");

		mockFetch("https://example.com/webapi/query.cgi*", {
			body: JSON.stringify({
				success: true,
				data: apiInfo,
			}),
		});

		mockFetch("https://example.com/webapi/auth.cgi*", {
			body: JSON.stringify(loginResp),
		});

		const ds = new SynologyDS({
			baseUrl: "https://example.com",
			username: "test",
			password: "test",
		});

		await ds.initialize();
		const sid = await ds.authenticate();

		assertEquals(sid, "test-session-id");
		assertEquals(ds.sid, "test-session-id");
	});

	await t.step("getTasks", async () => {
		const apiInfo = createApiInfoResponse();
		const loginResp = createLoginResponse("test-session-id");
		const tasks = createTaskList(3);
		const tasksResponse = createTasksListResponse(tasks);

		mockFetch("https://example.com/webapi/query.cgi*", {
			body: JSON.stringify({
				success: true,
				data: apiInfo,
			}),
		});

		mockFetch("https://example.com/webapi/auth.cgi*", {
			body: JSON.stringify(loginResp),
		});

		mockFetch("https://example.com/webapi/DownloadStation/task.cgi*", {
			body: JSON.stringify(tasksResponse),
		});

		const ds = new SynologyDS({
			baseUrl: "https://example.com",
			username: "test",
			password: "test",
		});

		await ds.initialize();
		await ds.authenticate();
		const retrievedTasks = await ds.getTasks();

		assertEquals(retrievedTasks.length, 3);
		assertEquals(ds.tasksMap.size, 3);
	});

	await t.step("removeTasksByIds", async () => {
		const apiInfo = createApiInfoResponse();
		const loginResp = createLoginResponse("test-session-id");
		const deleteResp = createDeleteResponse(["task1", "task2"]);

		mockFetch("https://example.com/webapi/query.cgi*", {
			body: JSON.stringify({
				success: true,
				data: apiInfo,
			}),
		});

		mockFetch("https://example.com/webapi/auth.cgi*", {
			body: JSON.stringify(loginResp),
		});

		mockFetch("https://example.com/webapi/DownloadStation/task.cgi*", {
			body: JSON.stringify(deleteResp),
		});

		const ds = new SynologyDS({
			baseUrl: "https://example.com",
			username: "test",
			password: "test",
		});

		await ds.initialize();
		await ds.authenticate();
		const results = await ds.removeTasksByIds(["task1", "task2"]);

		assertEquals(results.length, 2);
		assertEquals(results[0].id, "task1");
		assertEquals(results[0].error, 0);
		assertEquals(results[1].id, "task2");
		assertEquals(results[1].error, 0);
	});

	await t.step("purgeTasksBySize", async () => {
		const apiInfo = createApiInfoResponse();
		const loginResp = createLoginResponse("test-session-id");

		const tasks = [
			createTaskForPurgeTest(1, 0.001, 1, { id: "task1" }),
			createTaskForPurgeTest(2, 0.002, 2, { id: "task2" }),
			createTaskForPurgeTest(3, 0.003, 3, { id: "task3" }),
		];
		const tasksResponse = createTasksListResponse(tasks);
		const deleteResp = createDeleteResponse(["task1", "task2"]);

		mockFetch("https://example.com/webapi/query.cgi*", {
			body: JSON.stringify({
				success: true,
				data: apiInfo,
			}),
		});

		mockFetch("https://example.com/webapi/auth.cgi*", {
			body: JSON.stringify(loginResp),
		});

		mockFetch("https://example.com/webapi/DownloadStation/task.cgi*", {
			body: JSON.stringify(tasksResponse),
		});

		mockFetch("https://example.com/webapi/DownloadStation/task.cgi*", {
			body: JSON.stringify(deleteResp),
		});

		const ds = new SynologyDS({
			baseUrl: "https://example.com",
			username: "test",
			password: "test",
		});

		await ds.initialize();
		await ds.authenticate();
		const result = await ds.purgeTasksBySize(2.5, false);

		assertEquals(result.tasksToPurge.length, 2);
		assertEquals(result.successfulCount, 2);
		assertEquals(result.failedCount, 0);
	});

	await t.step("validatePath", async () => {
		await assertRejects(
			async () => {
				const ds = new SynologyDS({
					baseUrl: "https://example.com",
					username: "test",
					password: "test",
					basePath: "/downloads",
				});

				ds.validatePath("/downloads/torrent1");

				ds.validatePath("/other/torrent1");
			},
			Error,
			"path does not start with expected base directory",
		);
	});
});
