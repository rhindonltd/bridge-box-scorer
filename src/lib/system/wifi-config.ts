import "server-only";

import fs from "fs";
import path from "path";

/**
 * Path to the committed WiFi config the app writes to hand a chosen network to
 * provisioning. Provisioning reads THIS exact path during its online window and
 * connects the box to it, so it must match the provisioning contract:
 * `/home/bridgebox/wifi.json`. Overridable via env for tests / non-default
 * installs.
 */
export const WIFI_CONFIG_PATH =
  process.env.WIFI_CONFIG_PATH ?? "/home/bridgebox/wifi.json";

/** Shape of the committed WiFi config consumed by provisioning. */
export type WifiConfig = {
  ssid: string;
  password: string;
};

/**
 * Atomically write the WiFi config to {@link WIFI_CONFIG_PATH}.
 *
 * A systemd watcher on the box reacts to changes to this file and connects to
 * the new network. An in-place `writeFileSync` would let that watcher fire
 * mid-write and read a truncated/invalid file (the helper's `jq` empty check
 * then rejects it and skips the connect). To make the update all-or-nothing we
 * write a sibling temp file, fsync it, then `rename()` it over the target:
 * `rename(2)` is atomic on the same filesystem, so a reader ever only sees the
 * old file or the fully-written new one — never a partial write.
 *
 * The temp file MUST live in the same directory as the target (not /tmp) so the
 * rename stays on one filesystem; a cross-device rename is not atomic. A unique
 * suffix avoids two concurrent saves clobbering each other's temp file.
 */
export function writeWifiConfig(config: WifiConfig): void {
  const dir = path.dirname(WIFI_CONFIG_PATH);
  const tmpPath = path.join(
    dir,
    `.${path.basename(WIFI_CONFIG_PATH)}.${process.pid}.${Date.now()}.tmp`,
  );

  const contents = JSON.stringify(config, null, 2);

  // Write + flush the temp file to disk before swapping it in, so the rename
  // publishes fully-persisted bytes even across a crash/power loss.
  const fd = fs.openSync(tmpPath, "w", 0o600);
  try {
    fs.writeFileSync(fd, contents);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  try {
    fs.renameSync(tmpPath, WIFI_CONFIG_PATH);
  } catch (err) {
    // Don't leave a stray temp file behind if the atomic swap failed.
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // best-effort cleanup; surface the original rename error below
    }
    throw err;
  }
}

/** Read the saved WiFi SSID from the on-disk config, if present. */
export function readSavedSSID(): string | null {
  if (!fs.existsSync(WIFI_CONFIG_PATH)) return null;
  try {
    const savedConfig = JSON.parse(fs.readFileSync(WIFI_CONFIG_PATH, "utf-8"));
    return savedConfig?.ssid ?? null;
  } catch {
    return null;
  }
}
