import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";
import { readScanResult } from "@/lib/system/wifi-config";

/**
 * GET /api/system/wifi/scan/status
 *
 * Returns the most recent WiFi scan result.
 *
 * The scan itself (POST /api/system/wifi/scan) takes the hosted hotspot down to
 * free the single radio, so the client that started the scan loses its
 * connection and never sees the scan's own HTTP response. Once the AP returns
 * and the client reconnects, it polls this endpoint to read the networks.
 *
 * Shape:
 *   { result: null }                                       -> no scan has run
 *   { result: { networks, at, inProgress, failed? } }      -> latest scan
 *
 * Read-only, so intentionally unauthenticated (mirroring the reachability poll
 * and the test-status endpoint) — it exposes only nearby network names.
 */
export const GET = withBasicRoute(async () => {
  return success({ result: readScanResult() });
});
