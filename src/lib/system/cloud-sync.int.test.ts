import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { readCloudSyncStatus } from "./cloud-sync";

/**
 * Real-filesystem tests for reading the box-written status file. The path is
 * resolved lazily from `CLOUD_SYNC_STATUS_PATH`, so each test just points the
 * env var at a temp file (no module-registry reset needed).
 */

let tmpDir: string;
let statusPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cloud-sync-"));
  statusPath = path.join(tmpDir, "cloud-sync-status.json");
  process.env.CLOUD_SYNC_STATUS_PATH = statusPath;
});

afterEach(() => {
  delete process.env.CLOUD_SYNC_STATUS_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("readCloudSyncStatus", () => {
  it("reads a complete status file", () => {
    const status = {
      enabled: true,
      backup: {
        last_success: "2026-09-28T14:32:10Z",
        last_attempt: "2026-09-28T14:32:10Z",
        last_result: "ok",
      },
      logs: {
        last_success: "2026-09-28T14:32:12Z",
        last_attempt: "2026-09-28T14:47:00Z",
        last_result: "not_entitled",
      },
    };
    fs.writeFileSync(statusPath, JSON.stringify(status));

    expect(readCloudSyncStatus()).toEqual(status);
  });

  it("treats a missing file as not-enabled (no sync yet)", () => {
    // No file written.
    expect(readCloudSyncStatus()).toEqual({
      enabled: false,
      backup: { last_success: null, last_attempt: null, last_result: null },
      logs: { last_success: null, last_attempt: null, last_result: null },
    });
  });

  it("degrades a corrupt/partial file to not-enabled rather than throwing", () => {
    fs.writeFileSync(statusPath, "{ not valid json");

    expect(readCloudSyncStatus().enabled).toBe(false);
  });

  it("fills missing job fields with nulls", () => {
    // A minimal file with only `enabled` set — job sections absent.
    fs.writeFileSync(statusPath, JSON.stringify({ enabled: true }));

    expect(readCloudSyncStatus()).toEqual({
      enabled: true,
      backup: { last_success: null, last_attempt: null, last_result: null },
      logs: { last_success: null, last_attempt: null, last_result: null },
    });
  });
});
