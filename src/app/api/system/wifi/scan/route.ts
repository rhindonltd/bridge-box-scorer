import { NextResponse } from "next/server";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";
import { parseWifiScan } from "@/lib/system/wifi-scan";
import { getOwnAp } from "@/lib/system/wifi-ap";
import { runWifiCtl, WifiCtlBusyError } from "@/lib/system/wifi-ctl";
import { writeScanResult } from "@/lib/system/wifi-config";

/**
 * POST /api/system/wifi/scan
 *
 * Scans for nearby WiFi networks. The app runs unprivileged and NetworkManager
 * only lets root change networking, so the privileged scan is delegated to the
 * provisioning-owned sudo helper (`wifi-ctl.sh scan`). The helper takes the
 * shared network lock, drops the hotspot (single radio), runs
 * `nmcli device wifi list --rescan yes`, prints its RAW output verbatim, and
 * always restores the hotspot afterwards. Because the hotspot drops during the
 * scan, the caller is disconnected and this HTTP response usually never reaches
 * them — the outcome is persisted via {@link writeScanResult} and the client
 * reads it from `GET /api/system/wifi/scan/status` after reconnecting.
 * `inProgress` is written up-front so a client that reconnects mid-scan can tell
 * "still scanning" from "done".
 *
 * The appliance's own AP SSID is excluded from the list (read-only lookup, no
 * privilege needed). On failure the reason is logged and persisted so a
 * misconfiguration is diagnosable. If a provisioning window holds the lock, a
 * retriable "busy" message is returned.
 *
 * Admin-gated. On a device without WiFi management it returns 200
 * `{ available:false }` without touching the radio.
 */
export const POST = withAdminRoute(async () => {
  if (!(await isWifiManagementAvailable())) {
    return NextResponse.json(
      { success: false, error: "WiFi management not available on this device" },
      { status: 200 },
    );
  }

  // Read-only lookup of our own hotspot SSID so we can hide it from the picker.
  const ap = await getOwnAp();

  // Mark in-progress BEFORE the helper drops the hotspot so a reconnecting
  // client sees it.
  writeScanResult({
    networks: [],
    at: new Date().toISOString(),
    inProgress: true,
  });

  try {
    // The helper does the privileged drop-hotspot / rescan / restore-hotspot
    // dance and prints raw `nmcli device wifi list` output verbatim.
    const stdout = await runWifiCtl("scan");
    const networks = parseWifiScan(stdout, { excludeSSID: ap?.ssid ?? null });

    writeScanResult({
      networks,
      at: new Date().toISOString(),
      inProgress: false,
    });

    return success({ available: true, networks });
  } catch (err) {
    if (err instanceof WifiCtlBusyError) {
      // A provisioning window holds the lock; this is retriable, not a failure.
      writeScanResult({
        networks: [],
        at: new Date().toISOString(),
        inProgress: false,
        failed: true,
        error: err.message,
      });
      return NextResponse.json(
        { success: false, error: err.message, busy: true },
        { status: 200 },
      );
    }

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
  }
});
