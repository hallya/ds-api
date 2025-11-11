import config from "./config.ts";
import { retry } from "./retry.ts";

/**
 * Makes an HTTPS GET request to the Synology NAS API endpoint with retry logic.
 * @param path - The API endpoint path relative to the NAS URL.
 * @param paramsObj - An object containing query parameters to append to the URL.
 * @returns A promise that resolves to an object with 'status' (HTTP status code) and 'data' (parsed JSON response).
 */
export async function api(path: string, paramsObj: Record<string, string | number | boolean> = {}): Promise<{ status: number; data: unknown }> {
  return retry(async () => {
    if (!config.nasUrl) {
      throw new Error("NAS_URL is not configured");
    }

    const url = new URL(path, config.nasUrl);
    Object.entries(paramsObj).forEach(([k, v]) =>
      url.searchParams.set(k, String(v))
    );

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        signal: controller.signal,
        // Disable SSL verification if configured
        ...(config.synologyDisableSslVerification && {
          // Note: Deno doesn't have a direct way to disable SSL verification in fetch
          // This would require using a custom TLS client, but for now we'll rely on
          // DENO_TLS_CA_STORE environment variable or --unsafely-ignore-certificate-errors flag
        }),
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      let json: unknown;

      try {
        json = JSON.parse(text);
      } catch {
        // Try to extract JSON from response if it's wrapped in other content
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start >= 0 && end > start) {
          try {
            json = JSON.parse(text.slice(start, end + 1));
          } catch (e2) {
            throw new Error(`Server returned invalid JSON response: ${e2 instanceof Error ? e2.message : String(e2)}`);
          }
        } else {
          throw new Error("Server returned non-JSON response");
        }
      }

      return { status: response.status, data: json };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  });
}

