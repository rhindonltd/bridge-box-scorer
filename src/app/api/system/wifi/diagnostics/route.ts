import { withAdminRoute } from "@/lib/api/adminRoute";
import { success } from "@/lib/api/success";
import { isWifiManagementAvailable } from "@/lib/system/wifi-availability";
import { runNmcli } from "@/lib/system/nmcli";
import { getOwnAp } from "@/lib/system/wifi-ap";

/**
 * A single nmcli permission entry, e.g.
 * `org.freedesktop.NetworkManager.network-control` → `yes` / `no` / `auth`.
 */
type Permission = { key: string; value: string };

/**
 * Parse the output of `nmcli -t general permissions`. In terminal mode each
 * line is `PERMISSION:VALUE`.
 */
function parsePermissions(stdout: string): Permission[] {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      return {
        key: idx === -1 ? line : line.slice(0, idx),
        value: idx === -1 ? "" : line.slice(idx + 1),
      };
    });
}

/** Run an nmcli read and capture either its stdout or the error message. */
async function tryNmcli(
  args: string[],
): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
  try {
    return { ok: true, stdout: await runNmcli(args) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * GET /api/system/wifi/diagnostics
 *
 * Read-only WiFi diagnostics for troubleshooting why a scan/test is failing on
 * the appliance — most often a polkit permission problem (the app user lacks
 * `org.freedesktop.NetworkManager.*` privileges) or the hotspot not being an
 * nmcli AP-mode connection (so the scan can't free the radio).
 *
 * Runs entirely as the app's own process user, so the reported permissions and
 * AP detection reflect exactly what the scan/test code can actually do — unlike
 * running nmcli manually as root over SSH, which can mask a permission gap.
 *
 * Admin-gated and non-disruptive (it never brings the AP down). Returns:
 *   {
 *     wifiManagementAvailable: boolean,   // nmcli present on PATH
 *     permissions: {key,value}[] | null,  // nmcli general permissions
 *     permissionsError?: string,
 *     ownAp: { connectionName, ssid } | null,  // detected hosted AP
 *     activeConnections: string | null,   // raw NAME:TYPE list
 *     activeConnectionsError?: string,
 *   }
 */
export const GET = withAdminRoute(async () => {
  const wifiManagementAvailable = await isWifiManagementAvailable();

  if (!wifiManagementAvailable) {
    return success({
      wifiManagementAvailable: false,
      permissions: null,
      ownAp: null,
      activeConnections: null,
    });
  }

  const perms = await tryNmcli(["-t", "general", "permissions"]);
  const active = await tryNmcli([
    "-t",
    "-f",
    "NAME,TYPE",
    "connection",
    "show",
    "--active",
  ]);
  const ownAp = await getOwnAp();

  return success({
    wifiManagementAvailable: true,
    permissions: perms.ok ? parsePermissions(perms.stdout) : null,
    permissionsError: perms.ok ? undefined : perms.error,
    activeConnections: active.ok ? active.stdout : null,
    activeConnectionsError: active.ok ? undefined : active.error,
    ownAp,
  });
});
