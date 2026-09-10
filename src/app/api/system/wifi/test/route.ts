import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";
import { writeTestResult } from "@/lib/system/wifi-config";
import { runWifiCtl, WifiCtlBusyError } from "@/lib/system/wifi-ctl";

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
 * The helper adds a throwaway `bridge-box-wifi-test` profile, brings it up to
 * check association, then always tears it down and restores the hotspot — so
 * there is no separate teardown here in the normal path. It prints a
 * `TEST_RESULT:` line we parse for pass/fail.
 *
 * Because the helper drops the hotspot during the test, the caller is
 * disconnected and this HTTP response usually never reaches them. The outcome
 * is persisted via {@link writeTestResult}; the client reconnects and reads it
 * from `GET /api/system/wifi/test/status`. `inProgress` is written up-front.
 *
 * Response shape (for the rare case the response does reach the caller):
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

  const body = await req.json();

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

  // Mark in-progress BEFORE the helper drops the hotspot so a reconnecting
  // client can tell "still testing" from "done".
  writeTestResult({
    ssid,
    connected: false,
    at: new Date().toISOString(),
    inProgress: true,
  });

  try {
    // `yes` third arg only for a hidden SSID; omit otherwise.
    const args = hidden ? [ssid, password, "yes"] : [ssid, password];
    const stdout = await runWifiCtl("test-connect", args);
    const outcome = parseTestResult(stdout);

    // Association (a correct password) counts as connected and gates Save;
    // "connected-no-internet" still associated, just without a route out.
    const connected = outcome === "ok" || outcome === "connected-no-internet";
    const internet = outcome === "ok";

    writeTestResult({
      ssid,
      connected,
      internet,
      at: new Date().toISOString(),
      inProgress: false,
    });

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
      writeTestResult({
        ssid,
        connected: false,
        at: new Date().toISOString(),
        inProgress: false,
      });
      return NextResponse.json(
        { success: false, error: err.message, busy: true },
        { status: 200 },
      );
    }

    const reason = err instanceof Error ? err.message : String(err);
    console.error("WiFi test failed:", reason);

    writeTestResult({
      ssid,
      connected: false,
      at: new Date().toISOString(),
      inProgress: false,
    });

    return NextResponse.json(
      { success: false, error: "Failed to connect to the network" },
      { status: 200 },
    );
  }
});
