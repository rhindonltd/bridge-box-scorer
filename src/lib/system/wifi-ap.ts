import "server-only";

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** The appliance's own hosted access point, as NetworkManager sees it. */
export type OwnAp = {
  /** Connection profile name, e.g. used with `nmcli connection up/down`. */
  connectionName: string;
  /** The AP's SSID (the network name clients connect to). */
  ssid: string;
};

/**
 * Best-effort lookup of the appliance's own hosted access point.
 *
 * On the Bridge Box the single WiFi radio hosts a hotspot. NetworkManager
 * exposes it as an active connection whose `802-11-wireless.mode` is `ap`. We
 * need both its connection name (to bring it down/up around a scan, since a
 * single radio cannot scan while hosting the AP) and its SSID (to hide the
 * appliance's own network from the picker).
 *
 * Returns null when nothing is hosting an AP or the lookup fails.
 */
export async function getOwnAp(): Promise<OwnAp | null> {
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
      const { stdout: details } = await execFileAsync("nmcli", [
        "-t",
        "-f",
        "802-11-wireless.mode,802-11-wireless.ssid",
        "connection",
        "show",
        name,
      ]);

      // Output lines look like `802-11-wireless.mode:ap` and
      // `802-11-wireless.ssid:BridgeBox`.
      const lines = details.split("\n").filter(Boolean);
      const modeLine = lines.find((l) => l.startsWith("802-11-wireless.mode:"));
      const ssidLine = lines.find((l) => l.startsWith("802-11-wireless.ssid:"));

      if (modeLine?.split(":")[1] === "ap" && ssidLine) {
        const ssid = ssidLine.slice("802-11-wireless.ssid:".length);
        if (ssid) return { connectionName: name, ssid };
      }
    }
  } catch {
    // No AP found or nmcli unavailable — caller skips exclusion.
  }

  return null;
}

/** Bring the given connection profile down (frees the radio to scan). */
export async function bringConnectionDown(connectionName: string): Promise<void> {
  await execFileAsync("nmcli", ["connection", "down", connectionName]);
}

/** Bring the given connection profile back up (restores the hotspot). */
export async function bringConnectionUp(connectionName: string): Promise<void> {
  await execFileAsync("nmcli", ["connection", "up", connectionName]);
}
