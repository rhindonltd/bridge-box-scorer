import { describe, it, expect, afterEach, vi } from "vitest";

import { resolveLocale, DEFAULT_LOCALE } from "./locale";
import { getMessages } from "./index";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveLocale", () => {
  it("defaults to en-GB when the env var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_BRIDGE_LOCALE", undefined);
    expect(resolveLocale()).toBe("en-GB");
    expect(DEFAULT_LOCALE).toBe("en-GB");
  });

  it("returns the configured locale when it is supported", () => {
    vi.stubEnv("NEXT_PUBLIC_BRIDGE_LOCALE", "en-US");
    expect(resolveLocale()).toBe("en-US");
  });

  it("falls back to the default for an unrecognised locale", () => {
    vi.stubEnv("NEXT_PUBLIC_BRIDGE_LOCALE", "fr-FR");
    expect(resolveLocale()).toBe("en-GB");
  });
});

describe("getMessages — teams scoring options", () => {
  it("offers Point-a-Board (PAB) for en-GB", () => {
    const options = getMessages("en-GB").teamsScoringOptions;
    expect(options).toEqual([
      { label: "IMP (Victory Points)", value: "IMP" },
      { label: "Point-a-Board", value: "PAB" },
    ]);
  });

  it("offers Board-a-Match (BAM) for en-US", () => {
    const options = getMessages("en-US").teamsScoringOptions;
    expect(options).toEqual([
      { label: "IMP (Victory Points)", value: "IMP" },
      { label: "Board-a-Match", value: "BAM" },
    ]);
  });

  it("uses the device locale when none is passed", () => {
    vi.stubEnv("NEXT_PUBLIC_BRIDGE_LOCALE", "en-US");
    expect(getMessages().teamsScoringOptions).toContainEqual({
      label: "Board-a-Match",
      value: "BAM",
    });
  });
});
