/**
 * Tests d'intégration pour lib/api.ts avec mocks HTTP.
 * 
 * Ces tests vérifient que la fonction api() fonctionne correctement
 * avec différents scénarios (succès, erreurs, timeout, JSON malformé).
 * 
 * Note: Ces tests mockent fetch() directement pour simuler les réponses HTTP.
 */

import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setupTestLogger } from "../../helpers/setup.ts";

setupTestLogger();

Deno.test("api", async (t) => {
	await t.step("successful request returns status and data", async () => {
		const originalFetch = globalThis.fetch;
		const originalNasUrl = Deno.env.get("NAS_URL");
		
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

		Deno.env.set("NAS_URL", "https://example.com");

		try {
			const { api } = await import("../../../lib/api.ts");
			const result = await api("/webapi/test.cgi", { param: "value" });

			assertEquals(result.status, 200);
			assertEquals((result.data as { success?: boolean; data?: { test?: string } }).success, true);
			assertEquals((result.data as { success?: boolean; data?: { test?: string } }).data?.test, "value");
		} finally {
			globalThis.fetch = originalFetch;
			if (originalNasUrl) {
				Deno.env.set("NAS_URL", originalNasUrl);
			} else {
				Deno.env.delete("NAS_URL");
			}
		}
	});

	await t.step("handles non-200 status codes", async () => {
		const originalFetch = globalThis.fetch;
		const originalNasUrl = Deno.env.get("NAS_URL");
		
		globalThis.fetch = async () => {
			return new Response(
				JSON.stringify({ error: "Not found" }),
				{ status: 404 }
			);
		};

		Deno.env.set("NAS_URL", "https://example.com");

		try {
			const { api } = await import("../../../lib/api.ts");
			const result = await api("/webapi/test.cgi");

			assertEquals(result.status, 404);
			assertEquals((result.data as { error?: string }).error, "Not found");
		} finally {
			globalThis.fetch = originalFetch;
			if (originalNasUrl) {
				Deno.env.set("NAS_URL", originalNasUrl);
			} else {
				Deno.env.delete("NAS_URL");
			}
		}
	});

	await t.step("handles JSON wrapped in other content", async () => {
		const originalFetch = globalThis.fetch;
		const originalNasUrl = Deno.env.get("NAS_URL");
		
		globalThis.fetch = async () => {
			return new Response(
				`Some text before {"success": true, "data": {"key": "value"}} some text after`,
				{ status: 200 }
			);
		};

		Deno.env.set("NAS_URL", "https://example.com");

		try {
			const { api } = await import("../../../lib/api.ts");
			const result = await api("/webapi/test.cgi");

			assertEquals(result.status, 200);
			assertEquals((result.data as { success?: boolean; data?: { key?: string } }).success, true);
			assertEquals((result.data as { success?: boolean; data?: { key?: string } }).data?.key, "value");
		} finally {
			globalThis.fetch = originalFetch;
			if (originalNasUrl) {
				Deno.env.set("NAS_URL", originalNasUrl);
			} else {
				Deno.env.delete("NAS_URL");
			}
		}
	});

	await t.step("throws error for invalid JSON", async () => {
		const originalFetch = globalThis.fetch;
		const originalNasUrl = Deno.env.get("NAS_URL");
		
		globalThis.fetch = async () => {
			return new Response("Not JSON at all", { status: 200 });
		};

		Deno.env.set("NAS_URL", "https://example.com");

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
			if (originalNasUrl) {
				Deno.env.set("NAS_URL", originalNasUrl);
			} else {
				Deno.env.delete("NAS_URL");
			}
		}
	});

	await t.step("throws error when NAS_URL is not configured", async () => {
		const originalNasUrl = Deno.env.get("NAS_URL");
		Deno.env.delete("NAS_URL");

		try {
			const { api } = await import("../../../lib/api.ts");

			await assertRejects(
				async () => {
					await api("/webapi/test.cgi");
				},
				Error,
				"NAS_URL is not configured"
			);
		} finally {
			if (originalNasUrl) {
				Deno.env.set("NAS_URL", originalNasUrl);
			}
		}
	});
});

