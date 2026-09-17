// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";

/**
 * Integration coverage for the BridgeWebs credential store: saving encrypts the
 * password into the settings KV table, reading decrypts it back, and the public
 * status never exposes the password. Uses a real migrated system.db plus a
 * temp-file encryption key (BRIDGEWEBS_KEY_PATH).
 */
describe("bridgewebs credentials store", () => {
  let harness: DbHarness;
  let keyDir: string;

  beforeEach(async () => {
    keyDir = fs.mkdtempSync(path.join(os.tmpdir(), "bw-creds-"));
    process.env.BRIDGEWEBS_KEY_PATH = path.join(keyDir, "bridgewebs-key.txt");
    harness = createDbHarness("system");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
    delete process.env.BRIDGEWEBS_KEY_PATH;
    fs.rmSync(keyDir, { recursive: true, force: true });
  });

  it("saves and reads back decrypted credentials", async () => {
    const { saveBridgewebsCredentials } = await import(
      "@/db/system/actions/save-bridgewebs-credentials"
    );
    const { getBridgewebsCredentials } = await import(
      "@/db/system/queries/bridgewebs-credentials"
    );

    expect(await getBridgewebsCredentials()).toBeNull();

    await saveBridgewebsCredentials("myclub", "s3cret");
    expect(await getBridgewebsCredentials()).toEqual({
      club: "myclub",
      password: "s3cret",
    });
  });

  it("stores the password encrypted (not plaintext) in the settings table", async () => {
    const { saveBridgewebsCredentials, BRIDGEWEBS_PASSWORD_ENC_KEY } =
      await import("@/db/system/actions/save-bridgewebs-credentials");
    const { findSetting } = await import("@/db/system/queries/settings");

    await saveBridgewebsCredentials("myclub", "s3cret");

    const stored = await findSetting(BRIDGEWEBS_PASSWORD_ENC_KEY);
    expect(stored).not.toBeNull();
    expect(stored).not.toContain("s3cret");
    expect(stored!.split(":")).toHaveLength(3);
  });

  it("reports status without exposing the password", async () => {
    const { saveBridgewebsCredentials } = await import(
      "@/db/system/actions/save-bridgewebs-credentials"
    );
    const { getBridgewebsStatus } = await import(
      "@/db/system/queries/bridgewebs-credentials"
    );

    expect(await getBridgewebsStatus()).toEqual({
      configured: false,
      club: null,
    });

    await saveBridgewebsCredentials("myclub", "s3cret");

    const status = await getBridgewebsStatus();
    expect(status).toEqual({ configured: true, club: "myclub" });
    expect(JSON.stringify(status)).not.toContain("s3cret");
  });

  it("saveBridgewebsClub updates the club code without touching the password", async () => {
    const { saveBridgewebsCredentials, saveBridgewebsClub } = await import(
      "@/db/system/actions/save-bridgewebs-credentials"
    );
    const { getBridgewebsCredentials } = await import(
      "@/db/system/queries/bridgewebs-credentials"
    );

    await saveBridgewebsCredentials("myclub", "s3cret");
    await saveBridgewebsClub("renamedclub");

    expect(await getBridgewebsCredentials()).toEqual({
      club: "renamedclub",
      password: "s3cret",
    });
  });

  it("treats a club code with no stored password as not configured", async () => {
    const { saveBridgewebsClub } = await import(
      "@/db/system/actions/save-bridgewebs-credentials"
    );
    const { getBridgewebsCredentials, getBridgewebsStatus } = await import(
      "@/db/system/queries/bridgewebs-credentials"
    );

    await saveBridgewebsClub("myclub");

    expect(await getBridgewebsCredentials()).toBeNull();
    expect(await getBridgewebsStatus()).toEqual({
      configured: false,
      club: "myclub",
    });
  });
});
