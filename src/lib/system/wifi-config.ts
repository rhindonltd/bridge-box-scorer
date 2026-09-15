import "server-only";

import fs from "fs";

/**
 * Path to the committed WiFi config the app writes to hand a chosen network to
 * provisioning. Provisioning reads THIS exact path during its online window and
 * connects the box to it, so it must match the provisioning contract:
 * `/home/bridgebox/wifi.json`. Overridable via env for tests / non-default
 * installs.
 */
export const WIFI_CONFIG_PATH =
  process.env.WIFI_CONFIG_PATH ?? "/home/bridgebox/wifi.json";

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
