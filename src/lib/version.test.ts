import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * `version.ts` reads the commit from the environment at module-load time, so
 * each case resets the module registry and stubs env before importing.
 */
describe("version", () => {
  beforeEach(() => {
    vi.resetModules();
    // Remove every commit source so a real CI env doesn't leak in. Setting to
    // `undefined` deletes the var (an empty string would count as a value,
    // since the module coalesces with `??`).
    for (const key of [
      "APP_COMMIT",
      "GIT_COMMIT",
      "SOURCE_COMMIT",
      "VERCEL_GIT_COMMIT_SHA",
    ]) {
      vi.stubEnv(key, undefined as unknown as string);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes the package version and a null commit when none is set", async () => {
    const { APP_VERSION, getVersionInfo, getVersionLabel } =
      await import("./version");

    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(getVersionInfo()).toEqual({ version: APP_VERSION, commit: null });
    // With no commit, the label is just the version.
    expect(getVersionLabel()).toBe(APP_VERSION);
  });

  it("includes a short (7-char) commit in the label when one is provided", async () => {
    vi.stubEnv("APP_COMMIT", "a1b2c3d4e5f6");
    const { APP_VERSION, APP_COMMIT, getVersionInfo, getVersionLabel } =
      await import("./version");

    expect(APP_COMMIT).toBe("a1b2c3d4e5f6");
    expect(getVersionInfo()).toEqual({
      version: APP_VERSION,
      commit: "a1b2c3d4e5f6",
    });
    expect(getVersionLabel()).toBe(`${APP_VERSION} (a1b2c3d)`);
  });

  it("falls back through the recognised commit env vars", async () => {
    vi.stubEnv("GIT_COMMIT", "deadbeef1234");
    const { APP_COMMIT } = await import("./version");
    expect(APP_COMMIT).toBe("deadbeef1234");
  });
});
