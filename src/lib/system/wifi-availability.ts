import "server-only";

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Whether this device can manage WiFi. WiFi management shells out to `nmcli`
 * (NetworkManager); on hardware without it (dev machines, CI, non-appliance
 * hosts) WiFi settings cannot be scanned, tested, or saved.
 *
 * The result is cached for the process lifetime: `nmcli`'s presence does not
 * change while the server is running.
 */
let cached: boolean | undefined;

export async function isWifiManagementAvailable(): Promise<boolean> {
  if (cached !== undefined) return cached;

  try {
    // `command -v nmcli` exits 0 and prints a path when nmcli is on PATH.
    await execFileAsync("command", ["-v", "nmcli"], { shell: "/bin/sh" });
    cached = true;
  } catch {
    cached = false;
  }

  return cached;
}

/**
 * Reset the cached capability. Test-only seam; not used in production code.
 */
export function __resetWifiAvailabilityCache(): void {
  cached = undefined;
}
