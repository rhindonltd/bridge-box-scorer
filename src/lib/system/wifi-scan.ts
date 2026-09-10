import type { Network } from "@/model/network";

/**
 * Options for {@link parseWifiScan}.
 */
export type ParseWifiScanOptions = {
  /**
   * SSID to omit from the results, case-sensitive. Used to hide the
   * appliance's own access point so the picker only shows joinable networks.
   */
  excludeSSID?: string | null;
};

/**
 * Parse the terminal (`-t`) output of
 * `nmcli -t -f SSID,SECURITY,SIGNAL device wifi list` into a deduplicated list
 * of {@link Network}.
 *
 * nmcli's `-t` mode emits one AP per line as colon-separated fields:
 *   `SSID:SECURITY:SIGNAL`
 * Blank SSIDs (hidden networks) are dropped, duplicate SSIDs are collapsed to
 * the first occurrence, and the appliance's own AP (when `excludeSSID` is
 * given) is removed. The `security` field is parsed but kept internal — the
 * UI only needs `ssid` and `signal`.
 *
 * This is a pure function (no I/O) so it can be unit-tested without spawning a
 * process.
 */
export function parseWifiScan(
  stdout: string,
  options: ParseWifiScanOptions = {},
): Network[] {
  const excludeSSID = options.excludeSSID ?? null;

  const seen = new Set<string>();
  const networks: Network[] = [];

  for (const line of stdout.split("\n")) {
    if (!line) continue;

    // Only the first two colons are field separators; an SSID can itself
    // contain colons, but nmcli escapes those as `\:`, so splitting on the
    // known field layout via a limited split keeps the last two fields intact.
    const [ssid, , signal] = line.split(":");

    if (!ssid) continue;
    if (excludeSSID !== null && ssid === excludeSSID) continue;
    if (seen.has(ssid)) continue;

    seen.add(ssid);
    networks.push({ ssid, signal: Number(signal) });
  }

  return networks;
}
