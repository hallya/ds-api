/**
 * Integration tests for lib/synology-ds.ts with HTTP mocks.
 *
 * These tests verify that the SynologyDS class works correctly
 * with different scenarios by mocking API calls.
 */

import "@test-setup";

import { assertEquals, assertRejects } from "std/assert";
import { join } from "std/path";
import {
  setupApiMocks,
  mockQueryEndpoint,
  createAuthenticatedDS,
  mockTaskListResponse,
  mockDeleteResponse,
  setupPurgeMocks,
} from "../../helpers/synology-ds-setup.ts";
import { SynologyDS } from "../../../lib/synology-ds.ts";
import config from "../../../lib/config.ts";
import {
  createTaskList,
  createTaskForPurgeTest,
  createMinimalTaskDetail,
} from "../../helpers/task-factory.ts";
import { createTempDir } from "../../helpers/setup.ts";

Deno.test("synology-ds", async (t) => {
  await t.step("initialize", async () => {
    mockQueryEndpoint();

    const ds = new SynologyDS({
      baseUrl: config.nasUrl,
      username: "test",
      password: "test",
    });
    await ds.initialize();

    assertEquals(ds.apiInfo !== null, true);
    assertEquals(ds.apiInfo?.["SYNO.API.Auth"] !== undefined, true);
  });

  await t.step("authenticate", async () => {
    setupApiMocks();

    const ds = await createAuthenticatedDS({});
    const sid = ds.sid!;

    assertEquals(sid, "test-session-id");
    assertEquals(ds.sid, "test-session-id");
  });

  await t.step("getTasks", async () => {
    const tasks = createTaskList(3);
    setupApiMocks();
    mockTaskListResponse(tasks);

    const ds = await createAuthenticatedDS({});
    const retrievedTasks = await ds.getTasks();

    assertEquals(retrievedTasks.length, 3);
    assertEquals(ds.tasksMap.size, 3);
  });

  await t.step("removeTasksByIds", async () => {
    setupApiMocks();
    mockDeleteResponse(["task1", "task2"]);

    const ds = await createAuthenticatedDS({});
    const results = await ds.removeTasksByIds(["task1", "task2"]);

    assertEquals(results.length, 2);
    assertEquals(results[0].id, "task1");
    assertEquals(results[0].error, 0);
    assertEquals(results[1].id, "task2");
    assertEquals(results[1].error, 0);
  });

  await t.step("purgeTasksBySize", async () => {
    const tasks = [
      createTaskForPurgeTest(1, 0.001, 1, { id: "task1" }),
      createTaskForPurgeTest(2, 0.002, 2, { id: "task2" }),
      createTaskForPurgeTest(3, 0.003, 3, { id: "task3" }),
    ];
    setupPurgeMocks(tasks, ["task1", "task2"]);

    const ds = await createAuthenticatedDS({});
    const result = await ds.purgeTasksBySize(2.5, false);

    assertEquals(result.tasksToPurge.length, 2);
    assertEquals(result.successfulCount, 2);
    assertEquals(result.failedCount, 0);
  });

  await t.step("validatePath", async () => {
    await assertRejects(
      async () => {
        const ds = new SynologyDS({
          baseUrl: config.nasUrl,
          username: "test",
          password: "test",
          downloadRootPath: "/downloads",
        });

        ds.validatePath("/downloads/torrent1");

        ds.validatePath("/other/torrent1");
      },
      Error,
      "path does not start with expected root directory"
    );
  });
});
