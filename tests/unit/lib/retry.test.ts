import "@test-setup";

import { assertEquals, assertRejects } from "std/assert";
import { retry } from "../../../lib/retry.ts";

Deno.test("retry", async (t) => {
  await t.step("succeeds on first attempt", async () => {
    let attempts = 0;
    const result = await retry(async () => {
      attempts++;
      return "success";
    });

    assertEquals(result, "success");
    assertEquals(attempts, 1);
  });

  await t.step("retries on transient error and succeeds", async () => {
    let attempts = 0;
    const result = await retry(
      async () => {
        attempts++;
        if (attempts < 2) {
          const error = new Error("ECONNRESET");
          (error as Error & { code?: string }).code = "ECONNRESET";
          throw error;
        }
        return "success";
      },
      { attempts: 3, delay: 10 }
    );

    assertEquals(result, "success");
    assertEquals(attempts, 2);
  });

  await t.step("fails after max attempts on transient error", async () => {
    let attempts = 0;
    await assertRejects(
      async () => {
        await retry(
          async () => {
            attempts++;
            const error = new Error("ECONNRESET");
            (error as Error & { code?: string }).code = "ECONNRESET";
            throw error;
          },
          { attempts: 2, delay: 10 }
        );
      },
      Error,
      "ECONNRESET"
    );

    assertEquals(attempts, 3); // Initial attempt + 2 retries
  });

  await t.step("does not retry on non-transient error", async () => {
    let attempts = 0;
    await assertRejects(
      async () => {
        await retry(
          async () => {
            attempts++;
            throw new Error("Invalid credentials");
          },
          { attempts: 3, delay: 10 }
        );
      },
      Error,
      "Invalid credentials"
    );

    assertEquals(attempts, 1); // Should not retry
  });

  await t.step("uses custom shouldRetry function", async () => {
    let attempts = 0;
    const result = await retry(
      async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error("Custom error");
        }
        return "success";
      },
      {
        attempts: 3,
        delay: 10,
        shouldRetry: (error: unknown) => error instanceof Error && error.message === "Custom error",
      }
    );

    assertEquals(result, "success");
    assertEquals(attempts, 2);
  });

  await t.step("uses exponential backoff", async () => {
    const timestamps: number[] = [];

    await assertRejects(
      async () => {
        await retry(
          async () => {
            timestamps.push(Date.now());
            const error = new Error("ETIMEDOUT");
            (error as Error & { code?: string }).code = "ETIMEDOUT";
            throw error;
          },
          { attempts: 2, delay: 50 }
        );
      },
      Error
    );

    // Should have 3 timestamps (initial attempt + 2 retries)
    assertEquals(timestamps.length, 3);
    
    // Calculate delays between attempts
    const delay1 = timestamps[1] - timestamps[0];
    const delay2 = timestamps[2] - timestamps[1];
    
    // Second delay should be longer than first (exponential backoff)
    assertEquals(delay2 >= delay1, true);
    // Delays should be at least the base delay (50ms)
    assertEquals(delay1 >= 50, true);
  });

  await t.step("handles network timeout errors", async () => {
    let attempts = 0;
    await assertRejects(
      async () => {
        await retry(
          async () => {
            attempts++;
            throw new Error("Request timeout");
          },
          { attempts: 2, delay: 10 }
        );
      },
      Error,
      "Request timeout"
    );

    assertEquals(attempts, 3); // Should retry timeout errors
  });
});
