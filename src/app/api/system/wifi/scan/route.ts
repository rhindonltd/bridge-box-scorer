import { NextResponse } from "next/server";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";
import { parseWifiScan } from "@/lib/system/wifi-scan";
import { getOwnAp } from "@/lib/system/wifi-ap";
import { runWifiCtl, WifiCtlBusyError } from "@/lib/system/wifi-ctl";
import { logger } from "@/lib/log";

/**
 * POST /api/system/wifi/scan
 *
 * Scans for nearby WiFi networks. The app runs unprivileged and NetworkManager
 * only lets root change networking, so the privileged scan is delegated to the
 * provisioning-owned sudo helper (`wifi-ctl.sh scan`), which runs
 * `nmcli -t -f SSID,SECURITY,SIGNAL device wifi list --rescan yes` and prints
 * its RAW output verbatim. The `-t -f SSID,SECURITY,SIGNAL` flags matter: the
 * parser reads nmcli terminal mode (colon-separated `SSID:SECURITY:SIGNAL`),
 * not the default aligned table.
 *
 * The appliance now scans on its dedicated uplink adapter, so the players'
 * hotspot stays up throughout — the caller stays connected and reads the
 * networks straight from this response.
 *
 * The appliance's own AP SSID is excluded from the list (read-only lookup, no
 * privilege needed). On failure the reason is logged and returned so a
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

  try {
    // The helper does the privileged rescan and prints raw
    // `nmcli -t -f SSID,SECURITY,SIGNAL device wifi list` output verbatim
    // (terminal mode: colon-separated fields, one AP per line).
    const stdout = await runWifiCtl("scan");
    const networks = parseWifiScan(stdout, { excludeSSID: ap?.ssid ?? null });

    return success({ available: true, networks });
  } catch (err) {
    if (err instanceof WifiCtlBusyError) {
      // A provisioning window holds the lock; this is retriable, not a failure.
      return NextResponse.json(
        { success: false, error: err.message, busy: true },
        { status: 200 },
      );
    }

    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "WiFi scan failed");

    return NextResponse.json(
      { success: false, error: reason },
      { status: 200 },
    );
  }
});
