#!/usr/bin/env node

import { CLIHandler } from '../lib/cli-handler.js';

async function main() {
  const action = process.argv[2];
  const arg = process.argv[3] || "";
  const isDryRun = process.argv.includes('--dry-run');

  if (!action) {
    console.error('Usage: ds-torrents <command> [arguments] [--dry-run]');
    console.error('Commands: list, remove <titles>, purge <size in Go>, info <title>');
    process.exit(1);
  }

  const cli = await new CLIHandler().initialize();
  cli.setDryRun(isDryRun);

  await cli.executeCommand(action, arg);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});