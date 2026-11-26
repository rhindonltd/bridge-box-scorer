import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import { assertDirector } from "./director-auth";

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
