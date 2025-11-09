#!/usr/bin/env node

import 'dotenv/config';
import { CLIHandler } from '../lib/cli-handler.js';
import logger from '../lib/logger.js';

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isJson = args.includes('--json');
  const filteredArgs = args.filter(arg => arg !== '--dry-run' && arg !== '--json');
  const action = filteredArgs[0];
  const arg = filteredArgs[1] || "";

  if (!action) {
    logger.error('Usage: ds-torrents <command> [arguments] [--dry-run] [--json]');
    logger.error('Commands: list, remove <titles>, purge <size in Go>, info <title>');
    process.exit(1);
  }

  const cli = await new CLIHandler().initialize();
  cli.setDryRun(isDryRun);
  cli.setJson(isJson);

  await cli.executeCommand(action, arg);
}

main().catch((e) => {
  logger.error(e instanceof Error ? e.message : e);
  process.exit(1);
});