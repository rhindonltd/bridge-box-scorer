import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import {
  validateDirectorToken,
  assertDirector,
} from "./director-auth";

describe("validateDirectorToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when no token provided", () => {
    expect(validateDirectorToken(undefined, "game-1")).toBe(false);
    expect(validateDirectorToken(null, "game-1")).toBe(false);
  });

  it("returns true when token resolves to a DIRECTOR session for the correct game", () => {
    vi.mocked(findLoginSession).mockReturnValue({
      token: "valid-token",
      role: "DIRECTOR",
      gameId: "game-1",
    } as any);

    expect(validateDirectorToken("valid-token", "game-1")).toBe(true);
  });

  it("returns false when token resolves to a non-DIRECTOR session", () => {
    vi.mocked(findLoginSession).mockReturnValue({
      token: "player-token",
      role: "PLAYER",
      gameId: "game-1",
    } as any);

    expect(validateDirectorToken("player-token", "game-1")).toBe(false);
  });

  it("returns false when session is null", () => {
    vi.mocked(findLoginSession).mockReturnValue(null);

    expect(validateDirectorToken("unknown-token", "game-1")).toBe(false);
  });

  it("returns false when token is for a different game", () => {
    vi.mocked(findLoginSession).mockReturnValue({
      token: "valid-token",
      role: "DIRECTOR",
      gameId: "game-2",
    } as any);

    expect(validateDirectorToken("valid-token", "game-1")).toBe(false);
  });

  it("returns true when session gameId is null (global director)", () => {
    vi.mocked(findLoginSession).mockReturnValue({
      token: "valid-token",
      role: "DIRECTOR",
      gameId: null,
    } as any);

    expect(validateDirectorToken("valid-token", "game-1")).toBe(true);
  });

  it("returns false when findLoginSession throws", () => {
    vi.mocked(findLoginSession).mockImplementation(() => {
      throw new Error("DB failure");
    });

    expect(validateDirectorToken("crash-token", "game-1")).toBe(false);
  });
});

describe("assertDirector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true for a valid director token", () => {
    vi.mocked(findLoginSession).mockReturnValue({
      token: "valid-token",
      role: "DIRECTOR",
      gameId: "game-1",
    } as any);

    expect(assertDirector("valid-token", "game-1")).toBe(true);
  });

  it("returns false for an invalid token", () => {
    vi.mocked(findLoginSession).mockReturnValue(null);

    expect(assertDirector("bad-token", "game-1")).toBe(false);
  });

  it("invokes callback with error for invalid token", () => {
    vi.mocked(findLoginSession).mockReturnValue(null);
    const cb = vi.fn();

    assertDirector("bad-token", "game-1", cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Unauthorized",
    });
  });

  it("does not invoke callback for valid token", () => {
    vi.mocked(findLoginSession).mockReturnValue({
      token: "valid-token",
      role: "DIRECTOR",
      gameId: "game-1",
    } as any);
    const cb = vi.fn();

    assertDirector("valid-token", "game-1", cb);

    expect(cb).not.toHaveBeenCalled();
  });
});
