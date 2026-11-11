// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
/**
 * Integration coverage for the EBU credential store (real system.db plus a
 * temp encryption key).
 */
describe("ebu credentials store", () => {
  let harness: DbHarness;
  let keyDir: string;
  beforeEach(async () => {
    keyDir = fs.mkdtempSync(path.join(os.tmpdir(), "ebu-creds-"));
    process.env.BRIDGEWEBS_KEY_PATH = path.join(keyDir, "bridgewebs-key.txt");
    harness = createDbHarness("system");
    await harness.setup();
  });
  afterEach(() => {
    harness.teardown();
    delete process.env.BRIDGEWEBS_KEY_PATH;
    fs.rmSync(keyDir, { recursive: true, force: true });
  });
  it("is unconfigured until saved, then round-trips decrypted", async () => {
    const { saveEbuCredentials } = await import(
      "@/db/system/actions/save-ebu-credentials"
    );
    const { getEbuCredentials, getEbuStatus } = await import(
      "@/db/system/queries/ebu-credentials"
    );
    expect(await getEbuCredentials()).toBeNull();
    expect(await getEbuStatus()).toEqual({ configured: false, ebuNumber: null });
    await saveEbuCredentials("123456", "pw");
    expect(await getEbuCredentials()).toEqual({
      ebuNumber: "123456",
      password: "pw",
    });
    expect(await getEbuStatus()).toEqual({
      configured: true,
      ebuNumber: "123456",
    });
  });
  it("saveEbuNumber updates only the number and leaves the password", async () => {
    const { saveEbuCredentials, saveEbuNumber } = await import(
      "@/db/system/actions/save-ebu-credentials"
    );
    const { getEbuCredentials, getEbuStatus } = await import(
      "@/db/system/queries/ebu-credentials"
    );
    await saveEbuCredentials("111", "pw");
    await saveEbuNumber("222");
    expect(await getEbuCredentials()).toEqual({
      ebuNumber: "222",
      password: "pw",
    });
    expect((await getEbuStatus()).ebuNumber).toBe("222");
  });
  it("reports unconfigured when only the number is stored", async () => {
    const { saveEbuNumber } = await import(
      "@/db/system/actions/save-ebu-credentials"
    );
    const { getEbuCredentials, getEbuStatus } = await import(
      "@/db/system/queries/ebu-credentials"
    );
    await saveEbuNumber("333");
    expect(await getEbuCredentials()).toBeNull();
    expect(await getEbuStatus()).toEqual({
      configured: false,
      ebuNumber: "333",
    });
  });
});
