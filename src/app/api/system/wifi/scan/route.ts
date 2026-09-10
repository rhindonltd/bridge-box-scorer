import { NextResponse } from "next/server";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";
import { parseWifiScan } from "@/lib/system/wifi-scan";
import {
  getOwnAp,
  bringConnectionDown,
  bringConnectionUp,
} from "@/lib/system/wifi-ap";
import { runNmcli } from "@/lib/system/nmcli";
import { writeScanResult } from "@/lib/system/wifi-config";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** How long to let the radio settle after freeing it before scanning. */
const SETTLE_MS = 1000;

/**
 * Run a forced WiFi scan and return the raw nmcli stdout.
 *
 * This only works once the radio is free to scan (i.e. not hosting an AP).
 * `--rescan yes` forces a fresh scan regardless of cache age.
 */
async function runScan(): Promise<string> {
  return runNmcli([
    "-t",
    "-f",
    "SSID,SECURITY,SIGNAL",
    "device",
    "wifi",
    "list",
    "--rescan",
    "yes",
  ]);
}

/**
 * POST /api/system/wifi/scan
 *
 * Scans for nearby WiFi networks. On the Bridge Box the single radio hosts the
 * hotspot and NetworkManager refuses to scan an interface that is hosting an
 * AP ("Scanning not allowed while unavailable or activating"). So to get a real
 * list we must:
 *   1. bring the hosted AP connection down (frees the radio — this drops every
 *      connected device, including the director's),
 *   2. force a scan while the radio is free,
 *   3. bring the AP back up (always, in a finally) so the hotspot returns.
 *
 * Because step 1 disconnects the caller, the HTTP response below usually never
 * reaches them. The outcome is persisted via {@link writeScanResult}; the
 * client reconnects once the AP is back and reads it from
 * `GET /api/system/wifi/scan/status`. `inProgress` is written up-front so a
 * client that reconnects mid-scan can tell "still scanning" from "done".
 *
 * On failure the underlying nmcli error (stderr) is logged AND persisted into
 * the scan result's `error` field, so a permission / hostapd / PATH problem is
 * diagnosable from the UI and server logs rather than showing a generic
 * failure.
 *
 * Admin-gated (a disruptive device operation). On a device without WiFi
 * management it returns 200 `{ available:false }` without touching the radio.
 */
export const POST = withAdminRoute(async () => {
  if (!(await isWifiManagementAvailable())) {
    return NextResponse.json(
      { success: false, error: "WiFi management not available on this device" },
      { status: 200 },
    );
  }

  const ap = await getOwnAp();

  // Mark in-progress BEFORE the AP drops so a reconnecting client sees it.
  writeScanResult({
    networks: [],
    at: new Date().toISOString(),
    inProgress: true,
  });

  let apWasDown = false;
  try {
    // Free the radio if we're hosting an AP. Without this, the scan below
    // returns an empty/stale list on a single-radio box.
    if (ap) {
      await bringConnectionDown(ap.connectionName);
      apWasDown = true;
      // Let the interface settle into station mode before scanning.
      await delay(SETTLE_MS);
    }

    const stdout = await runScan();
    const networks = parseWifiScan(stdout, { excludeSSID: ap?.ssid ?? null });

    writeScanResult({
      networks,
      at: new Date().toISOString(),
      inProgress: false,
    });

    return success({ available: true, networks });
  } catch (err) {
    // Preserve the real reason (nmcli stderr / message) so it can be diagnosed
    // instead of surfacing a generic "scan failed".
    const reason = err instanceof Error ? err.message : String(err);
    console.error("WiFi scan failed:", reason);

    writeScanResult({
      networks: [],
      at: new Date().toISOString(),
      inProgress: false,
      failed: true,
      error: reason,
    });

    return NextResponse.json(
      { success: false, error: reason },
      { status: 200 },
    );
  } finally {
    // Always restore the hotspot so the appliance comes back online, even if
    // the scan threw.
    if (apWasDown && ap) {
      try {
        await bringConnectionUp(ap.connectionName);
      } catch (err) {
        // If this fails the box may need a reboot to restore the AP; log it so
        // the failure to restore the hotspot is at least visible.
        console.error("WiFi scan: failed to restore AP:", err);
      }
    }
  }
});
