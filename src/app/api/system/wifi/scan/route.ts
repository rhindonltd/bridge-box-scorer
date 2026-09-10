import { withBasicRoute } from "@/lib/api/basicRoute";
import { execFile } from "child_process";
import { promisify } from "util";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";
import { parseWifiScan } from "@/lib/system/wifi-scan";
import { getOwnApSsid } from "@/lib/system/wifi-ap";

const execFileAsync = promisify(execFile);

/** Short pause between a failed (busy) scan and the single retry. */
const RETRY_DELAY_MS = 1500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a forced WiFi scan and return the raw nmcli stdout.
 *
 * `--rescan yes` forces NetworkManager to actively scan regardless of how fresh
 * its cached AP list is. On the Bridge Box's single radio this briefly
 * interrupts the hosted hotspot to get a complete picture of nearby networks —
 * that disruption is intentional and the UI warns the user about it.
 *
 * ssid/security/signal are read in nmcli terminal mode so the output parses
 * cleanly line-by-line.
 */
async function runScan(): Promise<string> {
  const { stdout } = await execFileAsync("nmcli", [
    "-t",
    "-f",
    "SSID,SECURITY,SIGNAL",
    "device",
    "wifi",
    "list",
    "--rescan",
    "yes",
  ]);
  return stdout;
}

/**
 * POST /api/system/wifi/scan
 *
 * Lists nearby WiFi networks via nmcli, forcing a fresh scan. On a device
 * without WiFi management (no nmcli), returns `{ available: false, ssids: [] }`
 * (HTTP 200) so the UI can show a "WiFi can't be changed on this device" page
 * rather than a broken or empty network picker.
 *
 * The scan forces an active rescan (`--rescan yes`), which on a single-radio
 * appliance briefly interrupts the hotspot. Because that scan can transiently
 * fail while the radio is busy hosting the AP, a single retry is attempted
 * after a short delay. The appliance's own AP SSID is excluded from the results
 * so the picker only lists joinable networks.
 */
export const POST = withBasicRoute(async () => {
  if (!(await isWifiManagementAvailable())) {
    return success({ available: false, ssids: [] });
  }

  let stdout: string;
  try {
    stdout = await runScan();
  } catch {
    // The radio was likely busy (a scan interrupts the hosted AP). Give it a
    // moment and try once more before giving up.
    await delay(RETRY_DELAY_MS);
    stdout = await runScan();
  }

  const excludeSSID = await getOwnApSsid();
  const ssids = parseWifiScan(stdout, { excludeSSID });

  return success({ available: true, ssids });
});
