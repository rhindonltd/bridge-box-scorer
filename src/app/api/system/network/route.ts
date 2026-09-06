import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";

const execAsync = promisify(exec);

const WIFI_CONFIG = "/home/bridgebox/bridge-box/wifi.json";

/** Read the saved WiFi SSID from the on-disk config, if present. */
function readSavedSSID(): string | null {
  if (!fs.existsSync(WIFI_CONFIG)) return null;
  try {
    const savedConfig = JSON.parse(fs.readFileSync(WIFI_CONFIG, "utf-8"));
    return savedConfig?.ssid ?? null;
  } catch {
    return null;
  }
}

/**
 * GET /api/system/network
 *
 * Reports the current/saved WiFi connection. On a device without WiFi
 * management (no nmcli, e.g. dev machines / CI) this returns 200 with
 * `available: false` and no live SSID (mirroring the wifi/scan degradation)
 * rather than failing when nmcli is absent. When nmcli is present it reports
 * `available: true` plus the active/saved SSID.
 */
export const GET = withBasicRoute(async () => {
  const savedSSID = readSavedSSID();

  if (!(await isWifiManagementAvailable())) {
    return success({
      wifi: {
        available: false,
        connected: false,
        currentSSID: null,
        savedSSID,
      },
    });
  }

  const { stdout } = await execAsync(
    "nmcli -t -f ACTIVE,SSID dev wifi | egrep '^yes'",
  );

  const currentSSID = stdout.split(":")[1] || null;

  return success({
    wifi: {
      available: true,
      connected: !!currentSSID,
      currentSSID,
      savedSSID,
    },
  });
});
