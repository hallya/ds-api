#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net

import { load } from "std/dotenv/mod.ts";
import { CLIHandler } from "../lib/cli-handler.ts";
import logger from "../lib/logger.ts";

// Load environment variables from .env file
await load({ export: true });

async function main() {
  const args = Deno.args;
  const isDryRun = args.includes("--dry-run");
  const isJson = args.includes("--json");
  const filteredArgs = args.filter((arg) => arg !== "--dry-run" && arg !== "--json");
  const action = filteredArgs[0];
  const arg = filteredArgs[1] || "";

  if (!action) {
    logger.error("Usage: ds-torrents <command> [arguments] [--dry-run] [--json]");
    logger.error("Commands: list, remove <titles>, purge <size in Go>, info <title>");
    Deno.exit(1);
  }

  const cli = await new CLIHandler().initialize();
  cli.setDryRun(isDryRun);
  cli.setJson(isJson);

  await cli.executeCommand(action, arg);
}

main().catch((e) => {
  logger.error(e instanceof Error ? e.message : String(e));
  Deno.exit(1);
});

