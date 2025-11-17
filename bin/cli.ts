#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write --allow-net
import "../lib/env.ts";

import { CLIHandler } from "../lib/cli-handler.ts";
import { parseCLI } from "../lib/args.ts";
import logger from "../lib/logger.ts";

async function main() {
  const { action, arg, options } = parseCLI(Deno.args);

  if (!action) {
    logger.error(
      "Usage: ds-torrents <command> [arguments] [--dry-run] [--json [path]]"
    );
    logger.error(
      "Commands: list, remove <titles>, purge <size in Go>, info <title>"
    );
    Deno.exit(1);
  }

  const cli = await new CLIHandler().initialize();
  cli.setDryRun(options.dryRun);
  cli.setJson(options.jsonPath);

  await cli.executeCommand(action, arg);
}

main().catch((e) => {
  logger.error(e instanceof Error ? e.message : String(e));
  Deno.exit(1);
});
