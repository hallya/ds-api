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

const TEST_SESSION_ID = "test-session-id";
const TEST_USERNAME = "test";
const TEST_PASSWORD = "test";
const EXPECTED_TASK_COUNT = 3;
const PURGE_SIZE_THRESHOLD_GB = 2.5;
const SECONDS_PER_DAY = 86400;
const DAYS_AGO_ONE = 1;
const DAYS_AGO_TWO = 2;
const DAYS_AGO_FOUR = 4;

/**
 * Helper to assert successful deletion results.
 */
function assertSuccessfulDeletion(
  result: { id: string; error: number },
  expectedId: string
) {
  assertEquals(result.id, expectedId);
  assertEquals(
    result.error,
    0,
    `Expected deletion of ${expectedId} to succeed`
  );
}

/**
 * Helper to set up test file system structure for purge tests.
 * Creates directories and files as specified.
 * Content is derived from filename (e.g., "file1.mkv" -> "content1").
 */
async function setupTestFileSystem(
  rootDir: string,
  destination: string,
  taskFiles: Record<string, string>
): Promise<void> {
  const parentDir = join(rootDir, destination);
  await Deno.mkdir(parentDir, { recursive: true });

  for (const [taskTitle, fileName] of Object.entries(taskFiles)) {
    const taskDir = join(parentDir, taskTitle);
    await Deno.mkdir(taskDir, { recursive: true });

    const fileNumber = fileName.match(/\d+/)?.[0] ?? "1";
    await Deno.writeTextFile(join(taskDir, fileName), `content${fileNumber}`);
  }
}

/**
 * Helper to assert purge result matches expectations.
 */
function assertPurgeResult(
  result: {
    tasksToPurge: unknown[];
    successfulCount?: number;
    failedCount?: number;
  },
  expectedPurgedCount: number
): void {
  assertEquals(
    result.tasksToPurge.length,
    expectedPurgedCount,
    "Should purge correct number of tasks"
  );

  assertEquals(
    result.successfulCount!,
    expectedPurgedCount,
    "All deletions should succeed"
  );
  assertEquals(result.failedCount!, 0, "No deletions should fail");
}

/**
 * Helper to assert that specified task directories were deleted.
 */
async function assertFilesDeleted(
  rootDir: string,
  destination: string,
  taskTitles: string[]
): Promise<void> {
  for (const title of taskTitles) {
    const taskDir = join(rootDir, destination, title);
    await assertRejects(
      async () => await Deno.stat(taskDir),
      Deno.errors.NotFound
    );
  }
}

/**
 * Helper to assert that specified task directories still exist.
 */
async function assertFilesPreserved(
  rootDir: string,
  destination: string,
  taskTitles: string[]
): Promise<void> {
  const parentDir = join(rootDir, destination);
  const parentStat = await Deno.stat(parentDir);
  assertEquals(
    parentStat.isDirectory,
    true,
    "Parent directory should still exist"
  );

  for (const title of taskTitles) {
    const taskDir = join(parentDir, title);
    const stat = await Deno.stat(taskDir);
    assertEquals(
      stat.isDirectory,
      true,
      `Task directory ${title} should still exist`
    );
  }
}

Deno.test("synology-ds", async (t) => {
  await t.step("initialize", async () => {
    mockQueryEndpoint();

    const ds = new SynologyDS({
      baseUrl: config.nasUrl,
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
    });
    await ds.initialize();

    assertEquals(ds.apiInfo !== null, true, "API info should be initialized");
    assertEquals(
      ds.apiInfo?.["SYNO.API.Auth"] !== undefined,
      true,
      "Auth API should be available"
    );
  });

  await t.step("authenticate", async () => {
    setupApiMocks();

    const ds = await createAuthenticatedDS({});

    assertEquals(
      ds.sid,
      TEST_SESSION_ID,
      "Session ID should match expected value"
    );
  });

  await t.step("getTasks", async () => {
    const tasks = createTaskList(EXPECTED_TASK_COUNT);
    setupApiMocks();
    mockTaskListResponse(tasks);

    const ds = await createAuthenticatedDS({});
    const retrievedTasks = await ds.getTasks();

    assertEquals(
      retrievedTasks.length,
      EXPECTED_TASK_COUNT,
      "Should retrieve correct number of tasks"
    );
    assertEquals(
      ds.tasksMap.size,
      EXPECTED_TASK_COUNT,
      "Tasks map should contain all tasks"
    );
  });

  await t.step("removeTasksByIds", async () => {
    const taskIds = ["task1", "task2"];
    setupApiMocks();
    mockDeleteResponse(taskIds);

    const ds = await createAuthenticatedDS({});
    const results = await ds.removeTasksByIds(taskIds);

    assertEquals(
      results.length,
      taskIds.length,
      "Should return results for all tasks"
    );
    assertSuccessfulDeletion(results[0], taskIds[0]);
    assertSuccessfulDeletion(results[1], taskIds[1]);
  });

  await t.step("purgeTasksBySize", async () => {
    const tasks = [
      createTaskForPurgeTest(1, 0.001, DAYS_AGO_ONE, { id: "task1" }),
      createTaskForPurgeTest(2, 0.002, DAYS_AGO_TWO, { id: "task2" }),
      createTaskForPurgeTest(3, 0.003, 3, { id: "task3" }),
    ];
    const expectedPurgedTaskIds = ["task1", "task2"];
    setupPurgeMocks(tasks, expectedPurgedTaskIds);

    const ds = await createAuthenticatedDS({});
    const result = await ds.purgeTasksBySize(PURGE_SIZE_THRESHOLD_GB, false);

    assertEquals(
      result.tasksToPurge.length,
      expectedPurgedTaskIds.length,
      "Should purge correct number of tasks"
    );
    assertEquals(
      result.successfulCount,
      expectedPurgedTaskIds.length,
      "All deletions should succeed"
    );
    assertEquals(result.failedCount, 0, "No deletions should fail");
  });

  await t.step(
    "purgeTasksBySize uses full path (destination + title) for system deletion",
    async () => {
      const now = Math.floor(Date.now() / 1000);
      const destination = "torrents/series";
      const task1Title = "Dexter.New.Blood.S01";
      const task2Title = "Breaking.Bad.S01";
      const otherTaskTitle = "Other.Series.S01";

      const tasks = [
        createTaskForPurgeTest(1, 0.001, DAYS_AGO_ONE, {
          id: "task1",
          title: task1Title,
          additional: {
            detail: createMinimalTaskDetail({
              completed_time: now - SECONDS_PER_DAY * DAYS_AGO_ONE,
              create_time: now - SECONDS_PER_DAY * DAYS_AGO_TWO,
              destination,
              started_time: now - SECONDS_PER_DAY * DAYS_AGO_TWO,
            }),
          },
        }),
        createTaskForPurgeTest(2, 0.002, DAYS_AGO_TWO, {
          id: "task2",
          title: task2Title,
          additional: {
            detail: createMinimalTaskDetail({
              completed_time: now - SECONDS_PER_DAY * DAYS_AGO_TWO,
              create_time: now - SECONDS_PER_DAY * DAYS_AGO_FOUR,
              destination,
              started_time: now - SECONDS_PER_DAY * DAYS_AGO_FOUR,
            }),
          },
        }),
      ];
      const expectedPurgedTaskIds = ["task1", "task2"];
      setupPurgeMocks(tasks, expectedPurgedTaskIds);

      const { path: tempDir, cleanup } = await createTempDir();
      try {
        await setupTestFileSystem(tempDir, destination, {
          [task1Title]: "file1.mkv",
          [task2Title]: "file2.mkv",
          [otherTaskTitle]: "file3.mkv",
        });

        const ds = await createAuthenticatedDS({
          downloadRootPath: tempDir,
        });
        const result = await ds.purgeTasksBySize(
          PURGE_SIZE_THRESHOLD_GB,
          false
        );

        assertPurgeResult(result, expectedPurgedTaskIds.length);
        await assertFilesDeleted(tempDir, destination, [
          task1Title,
          task2Title,
        ]);
        await assertFilesPreserved(tempDir, destination, [otherTaskTitle]);
      } finally {
        await cleanup();
      }
    }
  );

  await t.step("validatePath", async () => {
    const validPath = "/downloads/torrent1";
    const invalidPath = "/other/torrent1";
    const downloadRoot = "/downloads";

    setupApiMocks();
    await assertRejects(
      async () => {
        const ds = await createAuthenticatedDS({
          downloadRootPath: downloadRoot,
        });

        ds.validatePath(validPath);
        ds.validatePath(invalidPath);
      },
      Error,
      "path does not start with expected root directory"
    );
  });
});
