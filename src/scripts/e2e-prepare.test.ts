import { describe, it, expect } from "vitest";
import { isThrowawayDir } from "./e2e-prepare";

describe("isThrowawayDir", () => {
  it("accepts the repo's .e2e-data dir and its games subdir", () => {
    expect(isThrowawayDir("/Users/me/repo/.e2e-data")).toBe(true);
    expect(isThrowawayDir("/Users/me/repo/.e2e-data/games")).toBe(true);
  });

  it("accepts e2e-* dirs and anything under /tmp", () => {
    expect(isThrowawayDir("/var/folders/x/e2e-run1")).toBe(true);
    expect(isThrowawayDir("/tmp/anything/here")).toBe(true);
  });

  it("refuses real data directories", () => {
    expect(isThrowawayDir("/home/bridgebox/data")).toBe(false);
    expect(isThrowawayDir("/home/bridgebox/data/games")).toBe(false);
    expect(isThrowawayDir("/Users/me/repo/data")).toBe(false);
    expect(isThrowawayDir("/")).toBe(false);
  });
});
