import "server-only";

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Error thrown when an `nmcli` invocation fails. Carries the pieces needed to
 * diagnose WHY it failed — which on the appliance is usually one of:
 *   - a permission denial (the app user lacks the polkit
 *     `org.freedesktop.NetworkManager.*` privileges), or
 *   - the interface being busy hosting the AP, or
 *   - nmcli not being installed / on PATH.
 * The raw stderr from nmcli is the most useful signal, so we preserve it.
 */
export class NmcliError extends Error {
  readonly args: string[];
  readonly stderr: string;
  readonly code: number | null;

  constructor(args: string[], stderr: string, code: number | null) {
    const detail = stderr.trim() || "(no stderr)";
    super(`nmcli ${args.join(" ")} failed (exit ${code ?? "?"}): ${detail}`);
    this.name = "NmcliError";
    this.args = args;
    this.stderr = stderr;
    this.code = code;
  }
}

/**
 * Run `nmcli` with the given argument array (never a shell string, to avoid
 * injection) and return its stdout. On failure, throws an {@link NmcliError}
 * that includes nmcli's stderr and exit code so callers can log/persist a
 * useful reason instead of a generic failure.
 */
export async function runNmcli(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("nmcli", args);
    return stdout;
  } catch (err) {
    const e = err as {
      stderr?: string | Buffer;
      code?: number;
      message?: string;
    };
    const stderr =
      typeof e.stderr === "string"
        ? e.stderr
        : e.stderr?.toString() ?? e.message ?? "";
    throw new NmcliError(args, stderr, e.code ?? null);
  }
}
