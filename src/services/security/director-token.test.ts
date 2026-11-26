import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import { validateDirectorToken } from "./director-token";

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

  it("returns false when session gameId is null (no global director)", () => {
    // A director token must be bound to a concrete game; a null-gameId session
    // must not act as a master key for every game.
    vi.mocked(findLoginSession).mockReturnValue({
      token: "valid-token",
      role: "DIRECTOR",
      gameId: null,
    } as any);

    expect(validateDirectorToken("valid-token", "game-1")).toBe(false);
  });

  it("returns false when findLoginSession throws", () => {
    vi.mocked(findLoginSession).mockImplementation(() => {
      throw new Error("DB failure");
    });

    expect(validateDirectorToken("crash-token", "game-1")).toBe(false);
  });
});
