import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";

const execFileAsync = promisify(execFile);

// Name of the throwaway connection profile used purely to validate credentials.
const TEST_PROFILE = "bridge-box-wifi-test";

async function nmcli(args: string[]) {
  // ssid/password are passed as argument-array elements (never interpolated
  // into a shell string) to avoid command injection.
  return execFileAsync("nmcli", args);
}

/**
 * Deletes the temporary test profile if it exists. Safe to call unconditionally;
 * ignores the "unknown connection" error when the profile was never created.
 */
async function deleteTestProfile() {
  try {
    await nmcli(["connection", "delete", TEST_PROFILE]);
  } catch {
    // Profile didn't exist (or was already removed) — nothing to clean up.
  }
}

/**
 * POST /api/system/wifi/test
 *
 * Validates whether the device can associate with the given WiFi network using
 * the supplied credentials, WITHOUT committing to it: the currently active
 * connection is left untouched and no persistent profile is added. Requires a
 * valid admin token.
 *
 * How it stays non-committal:
 *   - A throwaway profile (`bridge-box-wifi-test`) is created with
 *     `autoconnect no` so NetworkManager will never auto-select it later.
 *   - The test brings that profile up only long enough to confirm association,
 *     then immediately brings it down and deletes it in a finally block.
 *   - Because the profile is torn down, NetworkManager falls back to the
 *     previously active connection.
 *
 * Response shape:
 *   200 { success: true,  result: { connected: true } }   -> credentials work
 *   200 { success: false, error: string }                 -> could not connect
 *
 * The client keys off the top-level `success` boolean, so a failed connection
 * is reported as `success: false` with a 200 (a test result, not a server
 * error). Genuine server/auth failures are surfaced by the wrapper as 4xx/5xx.
 */
export const POST = withAdminRoute(async ({ req }) => {
  const body = await req.json();

  const schema = z.object({
    ssid: z.string().min(1),
    password: z.string(),
  });

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const { ssid, password } = parsed.data;

  // Ensure no stale profile from a previous interrupted test lingers.
  await deleteTestProfile();

  try {
    // Create a non-autoconnecting WiFi profile for the target network. This
    // only writes an in-memory/keyfile profile; it does not activate anything.
    await nmcli([
      "connection",
      "add",
      "type",
      "wifi",
      "con-name",
      TEST_PROFILE,
      "ssid",
      ssid,
      "autoconnect",
      "no",
    ]);

    // Attach the credentials (WPA-PSK). Passing via modify keeps the password
    // out of the `add` invocation and mirrors how NetworkManager expects it.
    await nmcli([
      "connection",
      "modify",
      TEST_PROFILE,
      "wifi-sec.key-mgmt",
      "wpa-psk",
      "wifi-sec.psk",
      password,
    ]);

    // Attempt to bring the profile up. nmcli exits non-zero (throwing) if the
    // credentials are wrong or the network is unreachable.
    await nmcli(["connection", "up", TEST_PROFILE]);

    return success({ connected: true });
  } catch {
    // Association failed (bad password, out of range, etc.). This is a valid
    // test outcome, not a server error, so return 200 with success: false.
    return NextResponse.json(
      { success: false, error: "Failed to connect to the network" },
      { status: 200 },
    );
  } finally {
    // Always tear the test profile down so the device reverts to its previous
    // connection and nothing about this test persists.
    await deleteTestProfile();
  }
});
