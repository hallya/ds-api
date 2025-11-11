import "@test-setup";

import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  validateRemoveArgs,
  validatePurgeArgs,
  validateInfoArgs,
  formatBytes,
  formatTimestamp,
} from "../../../lib/cli.ts";

Deno.test("cli", async (t) => {
  await t.step("validateRemoveArgs", async (t) => {
    await t.step("throws if titlesArg is empty", () => {
      assertThrows(
        () => validateRemoveArgs(""),
        Error,
        "Provide titles CSV"
      );
    });

    await t.step("throws if titlesArg is not provided", () => {
      assertThrows(
        () => validateRemoveArgs(""),
        Error,
        "Provide titles CSV"
      );
    });

    await t.step("accepts valid titles", () => {
      // Should not throw
      validateRemoveArgs("title1,title2");
    });
  });

  await t.step("validatePurgeArgs", async (t) => {
    await t.step("throws if sizeArg is empty", () => {
      assertThrows(
        () => validatePurgeArgs(""),
        Error,
        "Provide size in GB"
      );
    });

    await t.step("throws if sizeArg is not a number", () => {
      assertThrows(
        () => validatePurgeArgs("not-a-number"),
        Error,
        "Size must be a positive number"
      );
    });

    await t.step("throws if sizeArg is negative", () => {
      assertThrows(
        () => validatePurgeArgs("-5"),
        Error,
        "Size must be a positive number"
      );
    });

    await t.step("throws if sizeArg is zero", () => {
      assertThrows(
        () => validatePurgeArgs("0"),
        Error,
        "Size must be a positive number"
      );
    });

    await t.step("accepts valid size", () => {
      const size = validatePurgeArgs("10.5");
      assertEquals(size, 10.5);
    });

    await t.step("accepts integer size", () => {
      const size = validatePurgeArgs("10");
      assertEquals(size, 10);
    });
  });

  await t.step("validateInfoArgs", async (t) => {
    await t.step("throws if titleArg is empty", () => {
      assertThrows(
        () => validateInfoArgs(""),
        Error,
        "Provide title"
      );
    });

    await t.step("accepts valid title", () => {
      const title = validateInfoArgs("My Task Title");
      assertEquals(title, "My Task Title");
    });
  });

  await t.step("formatBytes", async (t) => {
    await t.step("formats zero bytes", () => {
      assertEquals(formatBytes(0), "0 Bytes");
    });

    await t.step("formats bytes", () => {
      assertEquals(formatBytes(500), "500 Bytes");
    });

    await t.step("formats kilobytes", () => {
      assertEquals(formatBytes(1500), "1.5 KB");
    });

    await t.step("formats megabytes", () => {
      assertEquals(formatBytes(1500000), "1.5 MB");
    });

    await t.step("formats gigabytes", () => {
      assertEquals(formatBytes(1500000000), "1.5 GB");
    });

    await t.step("formats terabytes", () => {
      assertEquals(formatBytes(1500000000000), "1.5 TB");
    });
  });

  await t.step("formatTimestamp", async (t) => {
    await t.step("returns 'N/A' for zero timestamp", () => {
      assertEquals(formatTimestamp(0), "N/A");
    });

    await t.step("formats valid timestamp", () => {
      const timestamp = 1609459200; // 2021-01-01 00:00:00 UTC
      const formatted = formatTimestamp(timestamp);
      // Should be a formatted date string
      assertEquals(typeof formatted, "string");
      assertEquals(formatted !== "N/A", true);
    });

    await t.step("handles undefined", () => {
      assertEquals(formatTimestamp(undefined as unknown as number), "N/A");
    });
  });
});
