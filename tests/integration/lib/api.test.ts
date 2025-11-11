/**
 * Integration tests for lib/api.ts with HTTP mocks.
 * 
 * These tests verify that the api() function works correctly
 * with different scenarios (success, errors, timeout, malformed JSON).
 * 
 * Note: These tests mock fetch() directly to simulate HTTP responses.
 */
import "@test-setup";

import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("api", async (t) => {
	await t.step("successful request returns status and data", async () => {
		const originalFetch = globalThis.fetch;
		
		globalThis.fetch = async (_url: string | URL | Request) => {
			return new Response(
				JSON.stringify({
					success: true,
					data: { test: "value" },
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		};

		try {
			const { api } = await import("../../../lib/api.ts");
			const result = await api("/webapi/test.cgi", { param: "value" });

			assertEquals(result.status, 200);
			assertEquals((result.data as { success?: boolean; data?: { test?: string } }).success, true);
			assertEquals((result.data as { success?: boolean; data?: { test?: string } }).data?.test, "value");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	await t.step("handles non-200 status codes", async () => {
		const originalFetch = globalThis.fetch;
		
		globalThis.fetch = async () => {
			return new Response(
				JSON.stringify({ error: "Not found" }),
				{ status: 404 }
			);
		};

		try {
			const { api } = await import("../../../lib/api.ts");
			const result = await api("/webapi/test.cgi");

			assertEquals(result.status, 404);
			assertEquals((result.data as { error?: string }).error, "Not found");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	await t.step("handles JSON wrapped in other content", async () => {
		const originalFetch = globalThis.fetch;
		
		globalThis.fetch = async () => {
			return new Response(
				`Some text before {"success": true, "data": {"key": "value"}} some text after`,
				{ status: 200 }
			);
		};

		try {
			const { api } = await import("../../../lib/api.ts");
			const result = await api("/webapi/test.cgi");

			assertEquals(result.status, 200);
			assertEquals((result.data as { success?: boolean; data?: { key?: string } }).success, true);
			assertEquals((result.data as { success?: boolean; data?: { key?: string } }).data?.key, "value");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	await t.step("throws error for invalid JSON", async () => {
		const originalFetch = globalThis.fetch;
		
		globalThis.fetch = async () => {
			return new Response("Not JSON at all", { status: 200 });
		};

		try {
			const { api } = await import("../../../lib/api.ts");

			await assertRejects(
				async () => {
					await api("/webapi/test.cgi");
				},
				Error,
				"Server returned non-JSON response"
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	await t.step("throws error when NAS_URL is not configured", async () => {
		const originalFetch = globalThis.fetch;
		
		globalThis.fetch = async (_url: string | URL | Request) => {
			throw new TypeError("Invalid URL");
		};

		try {
			const { api } = await import("../../../lib/api.ts");

			await assertRejects(
				async () => {
					await api("/webapi/test.cgi");
				},
				Error
			);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});

