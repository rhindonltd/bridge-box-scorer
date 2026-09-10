import "server-only";

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Fixed path to the provisioning-owned privileged WiFi helper. */
const WIFI_CTL = "/usr/local/bridgebox/bin/wifi-ctl.sh";

/**
 * The provisioning repo exposes wifi-ctl.sh as a root sudo helper with a small
 * allow-listed set of verbs. The app runs as the unprivileged `bridgebox` user
 * and NetworkManager only lets root change networking, so every PRIVILEGED
 * nmcli operation (scan, credential test) must go through this helper rather
 * than calling nmcli directly. Read-only nmcli calls do not need it.
 *
 * Each privileged verb takes the shared network lock, drops the hotspot (single
 * radio), does its work, and always restores the hotspot afterwards — so the
 * client's connection to the box drops during the operation and returns after.
 */

/** Substring the helper prints when a provisioning window holds the lock. */
const BUSY_MARKER = "another network operation is in progress";

/**
 * Error thrown when the helper reports the network lock is held (a provisioning
 * window is running). Callers should surface a retriable "busy, try again"
 * message rather than a hard failure.
 */
export class WifiCtlBusyError extends Error {
  constructor() {
    super("Another network operation is in progress. Please try again.");
    this.name = "WifiCtlBusyError";
  }
}

/** Error thrown when the helper exits non-zero for a non-busy reason. */
export class WifiCtlError extends Error {
  readonly verb: string;
  readonly stderr: string;
  readonly code: number | null;

  constructor(verb: string, stderr: string, code: number | null) {
    const detail = stderr.trim() || "(no stderr)";
    super(`wifi-ctl ${verb} failed (exit ${code ?? "?"}): ${detail}`);
    this.name = "WifiCtlError";
    this.verb = verb;
    this.stderr = stderr;
    this.code = code;
  }
}

/**
 * Run a privileged wifi-ctl verb via passwordless sudo and return its stdout.
 *
 * Args are passed as an argument array (never interpolated into a shell string)
 * to avoid injection. Throws {@link WifiCtlBusyError} when a provisioning
 * window holds the lock, or {@link WifiCtlError} for any other non-zero exit.
 */
export async function runWifiCtl(
  verb: string,
  args: string[] = [],
): Promise<string> {
  try {
    const { stdout } = await execFileAsync("sudo", [
      "-n",
      WIFI_CTL,
      verb,
      ...args,
    ]);
    return stdout;
  } catch (err) {
    const e = err as {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      code?: number;
      message?: string;
    };
    const stdout = e.stdout?.toString() ?? "";
    const stderr =
      typeof e.stderr === "string"
        ? e.stderr
        : e.stderr?.toString() ?? e.message ?? "";

    // The helper may report "busy" on either stream depending on how it exits.
    if (
      stdout.includes(BUSY_MARKER) ||
      stderr.includes(BUSY_MARKER)
    ) {
      throw new WifiCtlBusyError();
    }

    throw new WifiCtlError(verb, stderr, e.code ?? null);
  }
}
