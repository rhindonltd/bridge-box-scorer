import { describe, it, expect, afterEach, vi } from "vitest";
import { adminKeyDataDir, adminKeyFilePath } from "./admin-key-file";

describe("admin-key-file", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves the data dir from DATABASE_URL when set", () => {
    vi.stubEnv("DATABASE_URL", "/custom/data");
    expect(adminKeyDataDir()).toBe("/custom/data");
    expect(adminKeyFilePath()).toBe("/custom/data/admin-key.txt");
  });

  it("falls back to the built-in appliance path when DATABASE_URL is unset", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    expect(adminKeyDataDir()).toBe("/home/bridgebox/data");
    expect(adminKeyFilePath()).toBe("/home/bridgebox/data/admin-key.txt");
  });
});
