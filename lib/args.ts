/**
 * Command line argument parsing utilities.
 * Uses Deno's native API for argument handling.
 */

/**
 * Result of parsing command line arguments.
 * Contains flags (key-value pairs) and positional arguments.
 */
export interface ParsedArgs {
  /** Parsed flags as key-value pairs. Boolean flags have value `true`. */
  readonly flags: Readonly<Record<string, boolean | string | undefined>>;
  /** Positional arguments (non-flag arguments). */
  readonly positional: readonly string[];
}

/**
 * CLI-specific options extracted from parsed arguments.
 * Used to configure CLI behavior like dry-run mode and JSON output.
 */
export interface CLIOptions {
  /** Whether to enable dry-run mode (no actual operations performed). */
  readonly dryRun: boolean;
  /** Optional path for JSON output. Empty string means output to stdout. */
  readonly jsonPath?: string;
}

/**
 * Complete parsed CLI command structure.
 * Represents a parsed command with action, argument, and options.
 */
export interface ParsedCLI {
  /** The CLI action/command (e.g., "list", "remove", "purge", "info"). */
  readonly action: string;
  /** The argument passed to the action (e.g., task title, size limit). */
  readonly arg: string;
  /** CLI-specific options like dry-run and JSON output. */
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
 * 
 * @param args - Array of command line arguments (typically `Deno.args`).
 * @returns A parsed CLI structure with action, argument, and options.
 * 
 * @example
 * ```ts
 * const parsed = parseCLI(["list"]);
 * // { action: "list", arg: "", options: { dryRun: false } }
 * 
 * const parsed2 = parseCLI(["remove", "task-title", "--dry-run"]);
 * // { action: "remove", arg: "task-title", options: { dryRun: true } }
 * ```
 */
export function parseCLI(args: readonly string[]): ParsedCLI {
  const { flags, positional } = parseArgs(args);

  return {
    action: positional[0] || "",
    arg: positional[1] || "",
    options: extractCLIOptions(flags),
  };
}
