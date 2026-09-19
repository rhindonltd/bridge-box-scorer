import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * The key path is resolved from `BRIDGEWEBS_KEY_PATH` at call time, so each
 * test points it at a fresh temp file and imports a clean module copy.
 */
let tmpDir: string;
let keyPath: string;

async function loadModule() {
  vi.resetModules();
  return import("@/lib/system/bridgewebs-crypto");
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bw-crypto-"));
  keyPath = path.join(tmpDir, "bridgewebs-key.txt");
  process.env.BRIDGEWEBS_KEY_PATH = keyPath;
});

afterEach(() => {
  delete process.env.BRIDGEWEBS_KEY_PATH;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("bridgewebs-crypto", () => {
  it("round-trips a secret and produces opaque ciphertext", async () => {
    const { encryptSecret, decryptSecret } = await loadModule();

    const secret = "s3cr3t-p@ssword";
    const encrypted = encryptSecret(secret);

    expect(encrypted).not.toContain(secret);
    expect(encrypted.split(":")).toHaveLength(3);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("creates the key file once and reuses it across calls", async () => {
    const { encryptSecret, decryptSecret } = await loadModule();

    const a = encryptSecret("one");
    expect(fs.existsSync(keyPath)).toBe(true);
    const keyContents = fs.readFileSync(keyPath, "utf-8");

    // A second encrypt must not regenerate the key (or the first payload would
    // no longer decrypt).
    const b = encryptSecret("two");
    expect(fs.readFileSync(keyPath, "utf-8")).toBe(keyContents);

    expect(decryptSecret(a)).toBe("one");
    expect(decryptSecret(b)).toBe("two");

    // No stray temp files left behind.
    expect(fs.readdirSync(tmpDir)).toEqual(["bridgewebs-key.txt"]);
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await loadModule();
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("fails to decrypt tampered ciphertext", async () => {
    const { encryptSecret, decryptSecret } = await loadModule();

    const encrypted = encryptSecret("secret");
    const [iv, tag, data] = encrypted.split(":");
    // Flip a byte in the ciphertext segment.
    const badData = Buffer.from(data, "base64");
    badData[0] ^= 0xff;
    const tampered = [iv, tag, badData.toString("base64")].join(":");

    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws on a malformed payload", async () => {
    const { decryptSecret } = await loadModule();
    expect(() => decryptSecret("not-a-valid-payload")).toThrow(/Malformed/);
  });

  it("throws when the key file is corrupt", async () => {
    fs.writeFileSync(keyPath, "too-short");
    const { encryptSecret } = await loadModule();
    expect(() => encryptSecret("x")).toThrow(/invalid/);
  });

  it("cleans up the temp file and rethrows when the atomic rename fails", async () => {
    const { encryptSecret } = await loadModule();
    const renameSpy = vi.spyOn(fs, "renameSync").mockImplementation(() => {
      throw new Error("rename fail");
    });
    const unlinkSpy = vi.spyOn(fs, "unlinkSync");

    expect(() => encryptSecret("x")).toThrow(/rename fail/);
    // Best-effort cleanup removed the sibling temp file, and no key file was
    // left behind at the target path.
    expect(unlinkSpy).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(keyPath)).toBe(false);

    renameSpy.mockRestore();
    unlinkSpy.mockRestore();
  });

  it("still rethrows the rename error when temp-file cleanup also fails", async () => {
    const { encryptSecret } = await loadModule();
    const renameSpy = vi.spyOn(fs, "renameSync").mockImplementation(() => {
      throw new Error("rename fail");
    });
    const unlinkSpy = vi.spyOn(fs, "unlinkSync").mockImplementation(() => {
      throw new Error("unlink fail");
    });

    // The original rename error wins, not the cleanup error.
    expect(() => encryptSecret("x")).toThrow(/rename fail/);

    renameSpy.mockRestore();
    unlinkSpy.mockRestore();
  });
});
