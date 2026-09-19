import { describe, it, expect, afterEach, vi } from "vitest";
import {
  bridgewebsKeyDataDir,
  bridgewebsKeyFilePath,
} from "./bridgewebs-key-file";

describe("bridgewebs-key-file", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("bridgewebsKeyDataDir", () => {
    it("uses DATABASE_URL when set", () => {
      vi.stubEnv("DATABASE_URL", "/tmp/data");
      expect(bridgewebsKeyDataDir()).toBe("/tmp/data");
    });

    it("falls back to the built-in appliance path when unset", () => {
      vi.stubEnv("DATABASE_URL", undefined as unknown as string);
      expect(bridgewebsKeyDataDir()).toBe("/home/bridgebox/data");
    });
  });

  describe("bridgewebsKeyFilePath", () => {
    it("uses BRIDGEWEBS_KEY_PATH when set", () => {
      vi.stubEnv("BRIDGEWEBS_KEY_PATH", "/custom/key.txt");
      expect(bridgewebsKeyFilePath()).toBe("/custom/key.txt");
    });

    it("otherwise sits next to the data dir", () => {
      vi.stubEnv("BRIDGEWEBS_KEY_PATH", undefined as unknown as string);
      vi.stubEnv("DATABASE_URL", "/tmp/data");
      expect(bridgewebsKeyFilePath()).toBe("/tmp/data/bridgewebs-key.txt");
    });

    it("falls back to the appliance data dir when neither var is set", () => {
      vi.stubEnv("BRIDGEWEBS_KEY_PATH", undefined as unknown as string);
      vi.stubEnv("DATABASE_URL", undefined as unknown as string);
      expect(bridgewebsKeyFilePath()).toBe(
        "/home/bridgebox/data/bridgewebs-key.txt",
      );
    });
  });
});
