/**
 * Integration tests for file system operations in lib/synology-ds.ts.
 *
 * These tests verify that the deleteFromSystem method works correctly
 * with real file system operations using temporary directories.
 */

import "@test-setup";

import {
	assert,
	assertEquals,
	assertRejects,
	assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { SynologyDS } from "../../lib/synology-ds.ts";
import { createTempDir } from "../helpers/setup.ts";
import { join } from "std/path";

Deno.test("file-operations", async (t) => {
	await t.step("deleteFromSystem", async (t) => {
		await t.step("deletes single file successfully", async () => {
			const { path: tempDir, cleanup } = await createTempDir();
			try {
				const testFile = join(tempDir, "test-file.txt");
				await Deno.writeTextFile(testFile, "test content");

				const ds = new SynologyDS({
					baseUrl: "https://example.com",
					username: "test",
					password: "test",
					basePath: tempDir,
					path: tempDir,
				});

				const results = await ds.deleteFromSystem(["test-file.txt"]);

				assertEquals(results.length, 1);
				assertEquals(results[0].status, "fulfilled");
				assert(results[0].status === "fulfilled");
				assertEquals(results[0].value, join(tempDir, "test-file.txt"));

				await assertRejects(
					async () => await Deno.stat(testFile),
					Deno.errors.NotFound,
				);
			} finally {
				await cleanup();
			}
		});

		await t.step("deletes single directory successfully", async () => {
			const { path: tempDir, cleanup } = await createTempDir();
			try {
				const testDir = join(tempDir, "test-dir");
				await Deno.mkdir(testDir);
				await Deno.writeTextFile(join(testDir, "file.txt"), "content");

				const ds = new SynologyDS({
					baseUrl: "https://example.com",
					username: "test",
					password: "test",
					basePath: tempDir,
					path: tempDir,
				});

				const results = await ds.deleteFromSystem(["test-dir"]);

				assertEquals(results.length, 1);
				assertEquals(results[0].status, "fulfilled");
				assert(results[0].status === "fulfilled");
				assertEquals(results[0].value, join(tempDir, "test-dir"));

				await assertRejects(
					async () => await Deno.stat(testDir),
					Deno.errors.NotFound,
				);
			} finally {
				await cleanup();
			}
		});

		await t.step("deletes multiple files successfully", async () => {
			const { path: tempDir, cleanup } = await createTempDir();
			try {
				const file1 = join(tempDir, "file1.txt");
				const file2 = join(tempDir, "file2.txt");
				const file3 = join(tempDir, "file3.txt");
				await Deno.writeTextFile(file1, "content1");
				await Deno.writeTextFile(file2, "content2");
				await Deno.writeTextFile(file3, "content3");

				const ds = new SynologyDS({
					baseUrl: "https://example.com",
					username: "test",
					password: "test",
					basePath: tempDir,
					path: tempDir,
				});

				const results = await ds.deleteFromSystem([
					"file1.txt",
					"file2.txt",
					"file3.txt",
				]);

				assertEquals(results.length, 3);
				results.forEach((result) => {
					assertEquals(result.status, "fulfilled");
				});

				for (const file of [file1, file2, file3]) {
					await assertRejects(
						async () => await Deno.stat(file),
						Deno.errors.NotFound,
					);
				}
			} finally {
				await cleanup();
			}
		});

		await t.step("handles non-existent file gracefully", async () => {
			const { path: tempDir, cleanup } = await createTempDir();
			try {
				const ds = new SynologyDS({
					baseUrl: "https://example.com",
					username: "test",
					password: "test",
					basePath: tempDir,
					path: tempDir,
				});

				const results = await ds.deleteFromSystem(["non-existent.txt"]);

				assertEquals(results.length, 1);
				assertEquals(results[0].status, "rejected");
				assert(results[0].status === "rejected");
				assert(results[0].reason instanceof Error);
			} finally {
				await cleanup();
			}
		});

		await t.step("handles mixed success and failure", async () => {
			const { path: tempDir, cleanup } = await createTempDir();
			try {
				const existingFile = join(tempDir, "existing.txt");
				await Deno.writeTextFile(existingFile, "content");

				const ds = new SynologyDS({
					baseUrl: "https://example.com",
					username: "test",
					password: "test",
					basePath: tempDir,
					path: tempDir,
				});

				const results = await ds.deleteFromSystem([
					"existing.txt",
					"non-existent.txt",
				]);

				assertEquals(results.length, 2);
				assertEquals(results[0].status, "fulfilled");
				assertEquals(results[1].status, "rejected");

				await assertRejects(
					async () => await Deno.stat(existingFile),
					Deno.errors.NotFound,
				);
			} finally {
				await cleanup();
			}
		});

		await t.step(
			"validates path against basePath - path outside basePath",
			async () => {
				const { path: tempDir, cleanup } = await createTempDir();
				try {
					const ds = new SynologyDS({
						baseUrl: "https://example.com",
						username: "test",
						password: "test",
						basePath: tempDir,
						path: tempDir,
					});

					const results = await ds.deleteFromSystem(["../outside.txt"]);
					assertEquals(results.length, 1);
					assertEquals(results[0].status, "rejected");
					assert(results[0].status === "rejected");
					assert(results[0].reason instanceof Error);
					const error = results[0].reason as Error;
					assert(
						error.message.includes(
							"path does not start with expected base directory",
						),
					);
				} finally {
					await cleanup();
				}
			},
		);

		await t.step(
			"validates path against basePath - path contains ..",
			async () => {
				const { path: tempDir, cleanup } = await createTempDir();
				try {
					const ds = new SynologyDS({
						baseUrl: "https://example.com",
						username: "test",
						password: "test",
						basePath: tempDir,
						path: tempDir,
					});

					const pathWithDotDot = `${tempDir}/subdir/../file.txt`;
					assertThrows(
						() => {
							ds.validatePath(pathWithDotDot);
						},
						Error,
						"path contains '..'",
					);
				} finally {
					await cleanup();
				}
			},
		);

		await t.step("throws error when basePath is not configured", async () => {
			const ds = new SynologyDS({
				baseUrl: "https://example.com",
				username: "test",
				password: "test",
				basePath: "",
				path: "",
			});

			const results = await ds.deleteFromSystem(["file.txt"]);
			assertEquals(results.length, 1);
			assertEquals(results[0].status, "rejected");
			assert(results[0].status === "rejected");
			assert(results[0].reason instanceof Error);
			const error = results[0].reason as Error;
			assert(error.message.includes("Base path is not configured"));
		});

		await t.step("joins path with base path correctly", async () => {
			const { path: tempDir, cleanup } = await createTempDir();
			try {
				const subDir = join(tempDir, "subdir");
				await Deno.mkdir(subDir);
				const testFile = join(subDir, "test-file.txt");
				await Deno.writeTextFile(testFile, "content");

				const ds = new SynologyDS({
					baseUrl: "https://example.com",
					username: "test",
					password: "test",
					basePath: tempDir,
					path: tempDir,
				});

				const results = await ds.deleteFromSystem(["subdir/test-file.txt"]);

				assertEquals(results.length, 1);
				assertEquals(results[0].status, "fulfilled");
				assert(results[0].status === "fulfilled");
				assertEquals(results[0].value, testFile);

				await assertRejects(
					async () => await Deno.stat(testFile),
					Deno.errors.NotFound,
				);
			} finally {
				await cleanup();
			}
		});

		await t.step("deletes nested directory structure", async () => {
			const { path: tempDir, cleanup } = await createTempDir();
			try {
				const nestedDir = join(tempDir, "level1", "level2", "level3");
				await Deno.mkdir(nestedDir, { recursive: true });
				const testFile = join(nestedDir, "file.txt");
				await Deno.writeTextFile(testFile, "content");

				const ds = new SynologyDS({
					baseUrl: "https://example.com",
					username: "test",
					password: "test",
					basePath: tempDir,
					path: tempDir,
				});

				const results = await ds.deleteFromSystem(["level1"]);

				assertEquals(results.length, 1);
				assertEquals(results[0].status, "fulfilled");

				await assertRejects(
					async () => await Deno.stat(join(tempDir, "level1")),
					Deno.errors.NotFound,
				);
			} finally {
				await cleanup();
			}
		});
	});
});
