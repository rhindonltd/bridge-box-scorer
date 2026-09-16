import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";
import { runWifiCtl, WifiCtlBusyError } from "@/lib/system/wifi-ctl";
import { logger } from "@/lib/log";

/** Outcome parsed from the helper's `TEST_RESULT:` line. */
type TestOutcome = "ok" | "connected-no-internet" | "failed";

/**
 * Parse the helper's stdout for its `TEST_RESULT:` line. The helper prints one
 * of:
 *   TEST_RESULT: ok (connected + internet)
 *   TEST_RESULT: connected-no-internet (associated but no route out)
 *   TEST_RESULT: failed (could not connect — check password/SSID)
 */
function parseTestResult(stdout: string): TestOutcome {
  const line = stdout
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("TEST_RESULT:"));

  if (!line) return "failed";
  if (line.includes("connected-no-internet")) return "connected-no-internet";
  if (/TEST_RESULT:\s*ok\b/.test(line)) return "ok";
  return "failed";
}

/**
 * POST /api/system/wifi/test
 *
 * Validates whether the box can associate with the given WiFi network using the
 * supplied credentials, without committing to it. The app runs unprivileged, so
 * the privileged work is delegated to the provisioning-owned sudo helper:
 *
 *   wifi-ctl.sh test-connect "<ssid>" "<password>" [yes]
 *
 * The helper adds a throwaway `bridge-box-wifi-test` profile on the dedicated
 * uplink adapter, brings it up to check association, then always tears it down.
 * Because the test runs on the uplink adapter, the players' hotspot stays up
 * and the caller stays connected — so the outcome is read straight from this
 * response. The helper prints a `TEST_RESULT:` line we parse for pass/fail.
 *
 * Response shape:
 *   200 { success: true,  result: { connected, internet } }
 *   200 { success: false, error, busy? }
 */
export const POST = withAdminRoute(async ({ req }) => {
  if (!(await isWifiManagementAvailable())) {
    return NextResponse.json(
      { success: false, error: "WiFi management not available on this device" },
      { status: 200 },
    );
  }

  // Malformed JSON is a client error (400), not a 500.
  const body = await req.json().catch(() => null);

  const schema = z.object({
    ssid: z.string().min(1),
    password: z.string(),
    hidden: z.boolean().optional(),
  });

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const { ssid, password, hidden } = parsed.data;

  try {
    // `yes` third arg only for a hidden SSID; omit otherwise.
    const args = hidden ? [ssid, password, "yes"] : [ssid, password];
    const stdout = await runWifiCtl("test-connect", args);
    const outcome = parseTestResult(stdout);

    // Association (a correct password) counts as connected and gates Save;
    // "connected-no-internet" still associated, just without a route out.
    const connected = outcome === "ok" || outcome === "connected-no-internet";
    const internet = outcome === "ok";

    if (connected) {
      return success({ connected, internet });
    }
    return NextResponse.json(
      { success: false, error: "Failed to connect to the network" },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof WifiCtlBusyError) {
      // A provisioning window holds the lock; retriable, not a failure.
      return NextResponse.json(
        { success: false, error: err.message, busy: true },
        { status: 200 },
      );
    }

    // Surface the real reason (e.g. a sudo/helper invocation failure) rather
    // than a generic "couldn't connect", so a misconfiguration is diagnosable
    // from the UI and logs instead of looking like a wrong password. Mirrors
    // the scan route's error handling.
    const reason = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "WiFi test failed");

    return NextResponse.json(
      { success: false, error: `Test failed: ${reason}` },
      { status: 200 },
    );
  }
});
