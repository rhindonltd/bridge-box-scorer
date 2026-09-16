import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * Real-filesystem tests for the atomic WiFi config write. A systemd watcher on
 * the box reacts to `wifi.json` and connects to the new network, so the write
 * must be atomic (temp file + rename) — a reader must never observe a partial
 * file. `WIFI_CONFIG_PATH` is resolved at module load, so each test sets the
 * env var to a temp path and dynamically imports a fresh module copy.
 */

let tmpDir: string;
let configPath: string;

async function loadModule(configTarget: string) {
  process.env.WIFI_CONFIG_PATH = configTarget;
  // Reset the module registry so the module-level WIFI_CONFIG_PATH is
  // re-evaluated against the env var set above.
  vi.resetModules();
  return import("./wifi-config");
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wifi-config-"));
  configPath = path.join(tmpDir, "wifi.json");
});

afterEach(() => {
  delete process.env.WIFI_CONFIG_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("writeWifiConfig (atomic)", () => {
  it("writes the config to the target path as pretty JSON", async () => {
    const { writeWifiConfig } = await loadModule(configPath);

    writeWifiConfig({ ssid: "HomeNet", password: "secret" });

    const written = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(written).toEqual({ ssid: "HomeNet", password: "secret" });
  });

  it("leaves no temp files behind in the target directory", async () => {
    const { writeWifiConfig } = await loadModule(configPath);

    writeWifiConfig({ ssid: "HomeNet", password: "secret" });

    // Only the final file should remain — no `.wifi.json.*.tmp` siblings.
    const entries = fs.readdirSync(tmpDir);
    expect(entries).toEqual(["wifi.json"]);
  });

  it("overwrites an existing config atomically (result is the new content)", async () => {
    const { writeWifiConfig } = await loadModule(configPath);

    writeWifiConfig({ ssid: "Old", password: "old-pw" });
    writeWifiConfig({ ssid: "New", password: "new-pw" });

    const written = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(written).toEqual({ ssid: "New", password: "new-pw" });
    expect(fs.readdirSync(tmpDir)).toEqual(["wifi.json"]);
  });

  it("round-trips through readSavedSSID", async () => {
    const { writeWifiConfig, readSavedSSID } = await loadModule(configPath);

    writeWifiConfig({ ssid: "HomeNet", password: "secret" });

    expect(readSavedSSID()).toBe("HomeNet");
  });

  it("cleans up the temp file and throws when the rename target is unwritable", async () => {
    // Point the config at a path whose parent directory does not exist, so the
    // rename fails. The temp file is created in that same (missing) dir, so the
    // open itself fails first — either way nothing partial is left behind and
    // the error propagates.
    const missingDir = path.join(tmpDir, "does-not-exist");
    const badPath = path.join(missingDir, "wifi.json");
    const { writeWifiConfig } = await loadModule(badPath);

    expect(() =>
      writeWifiConfig({ ssid: "HomeNet", password: "secret" }),
    ).toThrow();

    // The (missing) directory was never created and holds nothing.
    expect(fs.existsSync(missingDir)).toBe(false);
  });
});
