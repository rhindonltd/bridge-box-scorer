import { describe, it, expect, beforeEach } from "vitest";
import {
  BLOCK_MS,
  FAILURE_WINDOW_MS,
  blockedFor,
  recordFailure,
  recordSuccess,
  resetSignInAttempts,
} from "./sign-in-attempts";

const game = (gameId: string) => ({ kind: "game", gameId }) as const;
const settings = { kind: "settings" } as const;

describe("sign-in attempts", () => {
  beforeEach(() => resetSignInAttempts());

  it("reports a burst on the third failure within the window, once", () => {
    expect(recordFailure("a", game("g1"), 0)).toEqual({ burst: false });
    expect(recordFailure("a", game("g1"), 1000)).toEqual({ burst: false });
    expect(recordFailure("a", game("g1"), 2000)).toEqual({
      burst: true,
      targets: [game("g1")],
      failures: 3,
    });
  });

  it("blocks the device for five minutes after a burst", () => {
    recordFailure("a", game("g1"), 0);
    recordFailure("a", game("g1"), 0);
    recordFailure("a", game("g1"), 0);
    expect(blockedFor("a", 1000)).toBe(BLOCK_MS - 1000);
    expect(blockedFor("a", BLOCK_MS)).toBeNull();
    // Once it has expired it stays clear.
    expect(blockedFor("a", BLOCK_MS + 1)).toBeNull();
  });

  it("is not blocked when it has never failed, or failed too few times", () => {
    expect(blockedFor("new")).toBeNull();
    recordFailure("a", settings, 0);
    expect(blockedFor("a", 1)).toBeNull();
  });

  it("forgets failures older than the window", () => {
    recordFailure("a", game("g1"), 0);
    recordFailure("a", game("g1"), 1);
    expect(recordFailure("a", game("g1"), FAILURE_WINDOW_MS + 1)).toEqual({
      burst: false,
    });
  });

  it("counts each device separately", () => {
    recordFailure("a", game("g1"), 0);
    recordFailure("a", game("g1"), 0);
    expect(recordFailure("b", game("g1"), 0)).toEqual({ burst: false });
  });

  it("counts both sign-ins together and lists each distinct target", () => {
    recordFailure("a", game("g1"), 0);
    recordFailure("a", settings, 0);
    expect(recordFailure("a", game("g1"), 0)).toEqual({
      burst: true,
      targets: [game("g1"), settings],
      failures: 3,
    });
    resetSignInAttempts();
    recordFailure("a", settings, 0);
    recordFailure("a", game("g2"), 0);
    expect(recordFailure("a", settings, 0)).toMatchObject({
      targets: [settings, game("g2")],
    });
  });

  it("starts counting again after a burst", () => {
    for (let i = 0; i < 3; i++) recordFailure("a", game("g1"), 0);
    expect(recordFailure("a", game("g1"), BLOCK_MS + 1)).toEqual({
      burst: false,
    });
  });

  it("a success clears the device's failures", () => {
    recordFailure("a", game("g1"), 0);
    recordFailure("a", game("g1"), 0);
    recordSuccess("a");
    expect(recordFailure("a", game("g1"), 0)).toEqual({ burst: false });
  });

  it("keeps its state on globalThis, shared across module copies", async () => {
    recordFailure("shared", game("g1"), 0);
    recordFailure("shared", game("g1"), 0);
    const { vi } = await import("vitest");
    vi.resetModules();
    const copy = await import("./sign-in-attempts");
    expect(copy.recordFailure("shared", game("g1"), 0)).toMatchObject({
      burst: true,
    });
  });
});
