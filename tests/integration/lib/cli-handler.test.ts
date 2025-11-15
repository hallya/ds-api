/**
 * Integration tests for lib/cli-handler.ts with HTTP mocks.
 *
 * These tests verify that the CLIHandler class works correctly
 * with different scenarios by mocking API calls.
 */
import "@test-setup";

import { assertEquals } from "std/assert";
import {
  createTask,
  createTaskForPurgeTest,
  createTaskList,
} from "../../helpers/task-factory.ts";
import {
  createAuthenticatedHandler,
  mockTaskListResponse,
  mockDeleteResponse,
} from "../../helpers/cli-handler-setup.ts";
import type { Task } from "../../../lib/types/index.ts";

Deno.test("cli-handler", async (t) => {
  await t.step("handleList", async () => {
    const tasks = createTaskList(2);
    mockTaskListResponse(tasks);

    const handler = await createAuthenticatedHandler();
    const result = await handler.handleList();

    assertEquals(result.length, 2, "Should return 2 tasks");
    assertEquals(Array.isArray(result), true, "Should return an array");
    result.forEach((task: Task, index: number) => {
      assertEquals(typeof task.id, "string", `Task ${index} should have an id`);
      assertEquals(typeof task.title, "string", `Task ${index} should have a title`);
      assertEquals(typeof task.size, "number", `Task ${index} should have a size`);
    });
  });

  await t.step("handleList with JSON output", async () => {
    const tasks = createTaskList(2);
    mockTaskListResponse(tasks);

    const handler = await createAuthenticatedHandler();
    handler.setJson(true);
    const result = await handler.handleList();

    assertEquals(result.length, 2, "Should return 2 tasks");
    assertEquals(Array.isArray(result), true, "Should return an array");

    const jsonContent = await Deno.readTextFile("torrents.json");
    const parsed = JSON.parse(jsonContent);
    assertEquals(Array.isArray(parsed), true, "JSON file should contain an array");
    assertEquals(parsed.length, 2, "JSON file should contain 2 tasks");
    assertEquals(parsed.length, result.length, "JSON file should have same number of tasks as return value");

    await Deno.remove("torrents.json");
  });

  await t.step("handleRemove", async () => {
    const tasks = [
      createTask({ id: "task1", title: "Torrent 1" }),
      createTask({ id: "task2", title: "Torrent 2" }),
    ];
    mockTaskListResponse(tasks);
    mockDeleteResponse(["task1"]);

    const handler = await createAuthenticatedHandler();
    handler.setDryRun(false);
    const result = await handler.handleRemove("Torrent 1");

    assertEquals(result.length, 1, "Should return one deletion result");
    assertEquals(result[0].id, "task1", "Should return result for task1");
    assertEquals(result[0].error, 0, "Should indicate successful deletion (error code 0)");
  });

  await t.step("handlePurge", async () => {
    const tasks = [
      createTaskForPurgeTest(1, 0.001, 1, { id: "task1" }),
      createTaskForPurgeTest(2, 0.002, 2, { id: "task2" }),
    ];
    mockTaskListResponse(tasks);
    mockDeleteResponse(["task1", "task2"]);

    const handler = await createAuthenticatedHandler();
    handler.setDryRun(false);
    const result = await handler.handlePurge("1.5");

    assertEquals(result.tasksToPurge.length, 2, "Should purge 2 tasks");
    assertEquals(result.tasksToPurge[0].id, "task1", "First task should be task1");
    assertEquals(result.tasksToPurge[1].id, "task2", "Second task should be task2");
    assertEquals(typeof result.totalSize, "number", "totalSize should be a number");
    assertEquals(result.totalSize > 0, true, "totalSize should be greater than 0");
  });

  await t.step("handleInfo", async () => {
    const tasks = [createTask({ id: "task1", title: "Torrent 1" })];
    mockTaskListResponse(tasks);

    const handler = await createAuthenticatedHandler();
    const result = await handler.handleInfo("Torrent 1");

    assertEquals(result.id, "task1", "Should return task1");
    assertEquals(result.title, "Torrent 1", "Should return task with title 'Torrent 1'");
    assertEquals(typeof result.size, "number", "size should be a number");
    assertEquals(typeof result.status, "string", "status should be a string");
    assertEquals(typeof result.type, "string", "type should be a string");
  });
});
