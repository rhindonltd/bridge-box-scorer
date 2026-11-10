import { describe, it, expect, vi, beforeEach } from "vitest";

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return { ...actual, execFile, default: { ...actual, execFile } };
});

import { triggerCloudSync } from "./cloud-sync";

describe("triggerCloudSync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs the helper via non-interactive sudo with an args array", () => {
    triggerCloudSync();
    expect(execFile).toHaveBeenCalledWith(
      "sudo",
      ["-n", "/usr/local/bridgebox/bin/cloud-sync-now.sh"],
      expect.any(Function),
    );
  });

  it("logs when the helper fails to start", () => {
    const log = { error: vi.fn() };
    const err = new Error("sudo: denied");
    execFile.mockImplementation((_c, _a, cb) => cb(err));
    triggerCloudSync(log as any);
    expect(log.error).toHaveBeenCalledWith(
      { err },
      "Cloud sync trigger failed to start",
    );
  });

  it("is silent on failure when no logger is given", () => {
    execFile.mockImplementation((_c, _a, cb) => cb(new Error("x")));
    expect(() => triggerCloudSync()).not.toThrow();
  });

  it("does not log on success", () => {
    const log = { error: vi.fn() };
    execFile.mockImplementation((_c, _a, cb) => cb(null));
    triggerCloudSync(log as any);
    expect(log.error).not.toHaveBeenCalled();
  });
});
