import "@test-setup";

import { assertEquals } from "std/assert";
import { pickAuthVersion } from "../../../lib/auth.ts";
import type { ApiInfo } from "../../../lib/types/api.ts";

Deno.test("auth", async (t) => {
  await t.step("pickAuthVersion", async (t) => {
    await t.step("uses maxVersion if available", () => {
      const info: ApiInfo = {
        "SYNO.API.Auth": {
          maxVersion: 7,
          version: 6,
        },
      };

      const version = pickAuthVersion(info);
      assertEquals(version, "7");
    });

    await t.step("falls back to version if maxVersion not available", () => {
      const info: ApiInfo = {
        "SYNO.API.Auth": {
          version: 6,
        },
      };

      const version = pickAuthVersion(info);
      assertEquals(version, "6");
    });

    await t.step("defaults to '7' if no version info", () => {
      const info: ApiInfo = {};

      const version = pickAuthVersion(info);
      assertEquals(version, "7");
    });

    await t.step("handles missing auth API info", () => {
      const info: ApiInfo = {
        "SYNO.DownloadStation.Task": {
          version: 2,
        },
      };

      const version = pickAuthVersion(info);
      assertEquals(version, "7");
    });
  });
});
