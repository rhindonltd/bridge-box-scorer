import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games/queries/find-participant-secret", () => ({
  findParticipantSecret: vi.fn(),
}));

const mockLog = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));
vi.mock("@/lib/log", () => ({
  logger: mockLog,
  childLogger: () => mockLog,
}));

import { findParticipantSecret } from "@/db/games/queries/find-participant-secret";
import { assertPlayer } from "./participant-auth";

describe("assertPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true for a valid token", async () => {
    vi.mocked(findParticipantSecret).mockResolvedValue("secret-abc");

    expect(await assertPlayer("game-1", "A1NS", "secret-abc")).toBe(true);
  });

  it("returns false for an invalid token", async () => {
    vi.mocked(findParticipantSecret).mockResolvedValue("secret-abc");

    expect(await assertPlayer("game-1", "A1NS", "wrong")).toBe(false);
  });

  it("invokes callback with error and logs a warning for an invalid token", async () => {
    vi.mocked(findParticipantSecret).mockResolvedValue("secret-abc");
    const cb = vi.fn();

    await assertPlayer("game-1", "A1NS", "wrong", cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Unauthorized",
    });
    expect(mockLog.warn).toHaveBeenCalledTimes(1);
    // The warning names the game and seat but never the token value.
    const [fields, msg] = mockLog.warn.mock.calls[0];
    expect(fields).toEqual({ gameId: "game-1", seat: "A1NS" });
    expect(JSON.stringify(fields)).not.toContain("wrong");
    expect(msg).toContain("invalid token");
  });

  it("does not invoke the callback or warn for a valid token", async () => {
    vi.mocked(findParticipantSecret).mockResolvedValue("secret-abc");
    const cb = vi.fn();

    await assertPlayer("game-1", "A1NS", "secret-abc", cb);

    expect(cb).not.toHaveBeenCalled();
    expect(mockLog.warn).not.toHaveBeenCalled();
  });
});
