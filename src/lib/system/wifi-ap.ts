import "server-only";

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Best-effort lookup of the appliance's own access-point SSID.
 *
 * On the Bridge Box the single WiFi radio hosts a hotspot; that hotspot shows
 * up in a scan as just another network. We hide it from the picker so a
 * director only sees networks they can actually join. NetworkManager exposes
 * the hosted AP as a connection whose `802-11-wireless.mode` is `ap`, so we ask
 * for the active connections in AP mode and read their SSID.
 *
 * Returns null when nothing is hosting an AP or the lookup fails — callers then
 * simply skip exclusion rather than error out.
 */
export async function getOwnApSsid(): Promise<string | null> {
  try {
    // List active connections as `NAME:TYPE`. We only care about wifi ones.
    const { stdout } = await execFileAsync("nmcli", [
      "-t",
      "-f",
      "NAME,TYPE",
      "connection",
      "show",
      "--active",
    ]);

    const wifiNames = stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split(":"))
      .filter(([, type]) => type === "802-11-wireless" || type === "wifi")
      .map(([name]) => name);

    for (const name of wifiNames) {
      const { stdout: mode } = await execFileAsync("nmcli", [
        "-t",
        "-f",
        "802-11-wireless.mode,802-11-wireless.ssid",
        "connection",
        "show",
        name,
      ]);

      // Output lines look like `802-11-wireless.mode:ap` and
      // `802-11-wireless.ssid:BridgeBox`.
      const lines = mode.split("\n").filter(Boolean);
      const modeLine = lines.find((l) => l.startsWith("802-11-wireless.mode:"));
      const ssidLine = lines.find((l) => l.startsWith("802-11-wireless.ssid:"));

      if (modeLine?.split(":")[1] === "ap" && ssidLine) {
        const ssid = ssidLine.slice("802-11-wireless.ssid:".length);
        if (ssid) return ssid;
      }
    }
  } catch {
    // No AP found or nmcli unavailable — caller skips exclusion.
  }

  return null;
}
