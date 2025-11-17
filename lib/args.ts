/**
 * Command line argument parsing utilities.
 * Uses Deno's native API for argument handling.
 */

/**
 * Result of parsing command line arguments.
 */
export interface ParsedArgs {
  readonly flags: Readonly<Record<string, boolean | string | undefined>>;
  readonly positional: readonly string[];
}

/**
 * CLI-specific options extracted from parsed arguments.
 */
export interface CLIOptions {
  readonly dryRun: boolean;
  readonly jsonPath?: string;
}

/**
 * Complete parsed CLI command structure.
 */
export interface ParsedCLI {
  readonly action: string;
  readonly arg: string;
  readonly options: CLIOptions;
}

/**
 * Parses command line arguments into flags and positional arguments.
 *
 * Supports:
 * - `--flag` (boolean flag)
 * - `--flag=value` (flag with value)
 * - `--flag value` (flag with separate value)
 */
function parseArgs(args: readonly string[]): ParsedArgs {
  const flags: Record<string, boolean | string | undefined> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Stop parsing flags at --
    if (arg === "--") {
      positional.push(...args.slice(i + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=", 2);

      if (value !== undefined) {
        // --flag=value
        flags[key] = value;
      } else if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        // --flag value
        flags[key] = args[i + 1];
        i++;
      } else {
        // --flag (boolean)
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

/**
 * Extracts CLI-specific options from parsed flags.
 */
function extractCLIOptions(
  flags: Readonly<Record<string, boolean | string | undefined>>,
): CLIOptions {
  const dryRun = flags["dry-run"] === true;

  let jsonPath: string | undefined = undefined;
  const jsonFlag = flags.json;
  if (jsonFlag !== undefined) {
    jsonPath = jsonFlag === true ? "" : String(jsonFlag);
  }

  return { dryRun, jsonPath };
}

/**
 * Parses CLI arguments and extracts command, argument, and options.
 */
export function parseCLI(args: readonly string[]): ParsedCLI {
  const { flags, positional } = parseArgs(args);

  return {
    action: positional[0] || "",
    arg: positional[1] || "",
    options: extractCLIOptions(flags),
  };
}
