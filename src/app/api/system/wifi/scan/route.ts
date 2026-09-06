import { withBasicRoute } from "@/lib/api/basicRoute";
import { exec } from "child_process";
import { promisify } from "util";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";

const execAsync = promisify(exec);

/**
 * POST /api/system/wifi/scan
 *
 * Lists nearby WiFi networks via nmcli. On a device without WiFi management
 * (no nmcli), returns `{ available: false, ssids: [] }` (HTTP 200) so the UI
 * can show a "WiFi can't be changed on this device" page rather than a broken
 * or empty network picker. When nmcli is present, returns
 * `{ available: true, ssids }`.
 */
export const POST = withBasicRoute(async () => {
  if (!(await isWifiManagementAvailable())) {
    return success({ available: false, ssids: [] });
  }

  const { stdout } = await execAsync(
    "nmcli -t -f SSID,SECURITY,SIGNAL dev wifi list",
  );

  const networks = stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [ssid, security, signal] = line.split(":");
      return {
        ssid,
        security,
        signal: Number(signal),
      };
    })
    .filter((n) => n.ssid !== "");

  // Remove duplicates (same SSID)
  const unique = Object.values(
    Object.fromEntries(networks.map((n) => [n.ssid, n])),
  );

  return success({ available: true, ssids: unique });
});
