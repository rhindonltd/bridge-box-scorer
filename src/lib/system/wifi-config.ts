import "server-only";

import fs from "fs";
import path from "path";

/**
 * Directory holding the appliance's WiFi state files. Overridable via env for
 * tests / non-default installs; defaults to the on-box location the network
 * route reads.
 */
export const WIFI_CONFIG_DIR =
  process.env.WIFI_CONFIG_DIR ?? "/home/bridgebox/bridge-box";

/** Path to the saved WiFi config written by the save route. */
export const WIFI_CONFIG_PATH = path.join(WIFI_CONFIG_DIR, "wifi.json");

/** Path to the last WiFi connection-test result. */
export const WIFI_TEST_RESULT_PATH = path.join(
  WIFI_CONFIG_DIR,
  "wifi-test-result.json",
);

/** Path to the last WiFi scan result. */
export const WIFI_SCAN_RESULT_PATH = path.join(
  WIFI_CONFIG_DIR,
  "wifi-scan-result.json",
);

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

/** The persisted outcome of the most recent WiFi connection test. */
export type WifiTestResult = {
  ssid: string;
  connected: boolean;
  /** ISO-8601 timestamp of when the test finished. */
  at: string;
  /**
   * True while a test is running. The test route sets this before it brings
   * the AP-interrupting connection up, and clears it once the result is
   * written, so a client that reconnects can tell "still testing" from "done".
   */
  inProgress: boolean;
};

/**
 * Persist the WiFi test outcome so a client whose connection dropped during the
 * (AP-interrupting) test can read it after the appliance's hotspot returns.
 * Best-effort: failures to write are swallowed since a missing file simply
 * reads back as "no result yet".
 */
export function writeTestResult(result: WifiTestResult): void {
  try {
    fs.mkdirSync(WIFI_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(WIFI_TEST_RESULT_PATH, JSON.stringify(result), "utf-8");
  } catch {
    // Best-effort; a missing result file reads back as "no result".
  }
}

/** Read the last persisted WiFi test result, or null when none exists. */
export function readTestResult(): WifiTestResult | null {
  if (!fs.existsSync(WIFI_TEST_RESULT_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(WIFI_TEST_RESULT_PATH, "utf-8"));
  } catch {
    return null;
  }
}

/** A single scanned network. */
export type ScannedNetwork = {
  ssid: string;
  signal: number;
};

/**
 * The persisted outcome of the most recent WiFi scan.
 *
 * Scanning on a single-radio appliance takes the hosted hotspot down to free
 * the radio, so the client that triggered the scan is disconnected and cannot
 * receive the scan's HTTP response. It reconnects once the hotspot returns and
 * reads this instead. `inProgress` lets it tell "still scanning" from "done".
 */
export type WifiScanResult = {
  networks: ScannedNetwork[];
  /** ISO-8601 timestamp of when the scan finished. */
  at: string;
  /** True while a scan is running (set before the AP drops, cleared after). */
  inProgress: boolean;
  /** True when the scan itself failed (nmcli error). */
  failed?: boolean;
};

/**
 * Persist the WiFi scan outcome so a client whose connection dropped during the
 * (AP-interrupting) scan can read it after the appliance's hotspot returns.
 * Best-effort: a missing file simply reads back as "no scan yet".
 */
export function writeScanResult(result: WifiScanResult): void {
  try {
    fs.mkdirSync(WIFI_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(WIFI_SCAN_RESULT_PATH, JSON.stringify(result), "utf-8");
  } catch {
    // Best-effort; a missing result file reads back as "no scan".
  }
}

/** Read the last persisted WiFi scan result, or null when none exists. */
export function readScanResult(): WifiScanResult | null {
  if (!fs.existsSync(WIFI_SCAN_RESULT_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(WIFI_SCAN_RESULT_PATH, "utf-8"));
  } catch {
    return null;
  }
}
