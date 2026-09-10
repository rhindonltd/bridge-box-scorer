import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";
import { readTestResult } from "@/lib/system/wifi-config";

/**
 * GET /api/system/wifi/test/status
 *
 * Returns the outcome of the most recent WiFi connection test.
 *
 * The test itself (POST /api/system/wifi/test) briefly interrupts the hosted
 * hotspot on a single-radio appliance, so the client that started the test
 * loses its connection and never sees the test's own HTTP response. Once the AP
 * returns and the client reconnects, it polls this endpoint to learn whether
 * the test succeeded.
 *
 * Shape:
 *   { result: null }                                  -> no test has run
 *   { result: { ssid, connected, at, inProgress } }   -> latest test outcome
 *
 * A read-only status check, so it is intentionally unauthenticated (mirroring
 * the reachability poll against /api/system/network) — it exposes no secrets,
 * only whether the last test connected.
 */
export const GET = withBasicRoute(async () => {
  return success({ result: readTestResult() });
});
