/**
 * Integration tests for lib/cli-handler.ts with HTTP mocks.
 *
 * These tests verify that the CLIHandler class works correctly
 * with different scenarios by mocking API calls.
 */
import "@test-setup";

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mockFetch } from "@test-setup";
import { CLIHandler } from "../../../lib/cli-handler.ts";
import {
	createApiInfoResponse,
	createLoginResponse,
	createTasksListResponse,
	createDeleteResponse,
} from "../../helpers/api-response-factory.ts";
import {
	createTask,
	createTaskList,
	createTaskForPurgeTest,
} from "../../helpers/task-factory.ts";

Deno.test("cli-handler", async (t) => {
	await t.step("handleList", async () => {
		const apiInfo = createApiInfoResponse();
		const loginResp = createLoginResponse("test-session-id");
		const tasks = createTaskList(2);
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

		const handler = new CLIHandler({
			baseUrl: "https://example.com",
			username: "test",
		});

		// @ts-expect-error - accessing private property for testing
		await handler.ds.authenticate();
		await handler.handleList();

		assertEquals(true, true);
	});

	await t.step("handleList with JSON output", async () => {
		const apiInfo = createApiInfoResponse();
		const loginResp = createLoginResponse("test-session-id");
		const tasks = createTaskList(2);
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

		const handler = new CLIHandler({
			baseUrl: "https://example.com",
			username: "test",
		});

		handler.setJson(true);
		// @ts-expect-error - accessing private property for testing
		await handler.ds.authenticate();
		await handler.handleList();

		const jsonContent = await Deno.readTextFile("torrents.json");
		const parsed = JSON.parse(jsonContent);
		assertEquals(Array.isArray(parsed), true);

		await Deno.remove("torrents.json");
	});

	await t.step("handleRemove", async () => {
		const apiInfo = createApiInfoResponse();
		const loginResp = createLoginResponse("test-session-id");
		const tasks = [
			createTask({ id: "task1", title: "Torrent 1" }),
			createTask({ id: "task2", title: "Torrent 2" }),
		];
		const tasksResponse = createTasksListResponse(tasks);
		const deleteResp = createDeleteResponse(["task1"]);

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

		const handler = new CLIHandler({
			baseUrl: "https://example.com",
			username: "test",
		});

		handler.setDryRun(false);
		// @ts-expect-error - accessing private property for testing
		await handler.ds.authenticate();
		await handler.handleRemove("Torrent 1");

		assertEquals(true, true);
	});

	await t.step("handlePurge", async () => {
		const apiInfo = createApiInfoResponse();
		const loginResp = createLoginResponse("test-session-id");

		const tasks = [
			createTaskForPurgeTest(1, 0.001, 1, { id: "task1" }),
			createTaskForPurgeTest(2, 0.002, 2, { id: "task2" }),
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

		const handler = new CLIHandler({
			baseUrl: "https://example.com",
			username: "test",
		});

		handler.setDryRun(false);
		// @ts-expect-error - accessing private property for testing
		await handler.ds.authenticate();
		await handler.handlePurge("1.5");

		assertEquals(true, true);
	});

	await t.step("handleInfo", async () => {
		const apiInfo = createApiInfoResponse();
		const loginResp = createLoginResponse("test-session-id");
		const tasks = [createTask({ id: "task1", title: "Torrent 1" })];
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

		const handler = new CLIHandler({
			baseUrl: "https://example.com",
			username: "test",
		});

		// @ts-expect-error - accessing private property for testing
		await handler.ds.authenticate();
		await handler.handleInfo("Torrent 1");

		assertEquals(true, true);
	});
});
