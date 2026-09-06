import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games/queries/find-participant-secret", () => ({
  findParticipantSecret: vi.fn(),
}));

import { findParticipantSecret } from "@/db/games/queries/find-participant-secret";
import { validatePlayerToken, assertPlayer } from "./participant-auth";

describe("validatePlayerToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false without a DB hit when no token is provided", async () => {
    expect(await validatePlayerToken("game-1", "A1NS", undefined)).toBe(false);
    expect(await validatePlayerToken("game-1", "A1NS", null)).toBe(false);
    expect(await validatePlayerToken("game-1", "A1NS", "")).toBe(false);

    expect(findParticipantSecret).not.toHaveBeenCalled();
  });

  it("returns true when the token matches the seat's stored secret", async () => {
    vi.mocked(findParticipantSecret).mockResolvedValue("secret-abc");

    expect(await validatePlayerToken("game-1", "A1NS", "secret-abc")).toBe(
      true,
    );
    expect(findParticipantSecret).toHaveBeenCalledWith("game-1", "A1NS");
  });

  it("returns false when the token does not match the stored secret", async () => {
    vi.mocked(findParticipantSecret).mockResolvedValue("secret-abc");

    expect(await validatePlayerToken("game-1", "A1NS", "wrong-token")).toBe(
      false,
    );
  });

  it("returns false (no crash) when supplied token length differs from stored", async () => {
    vi.mocked(findParticipantSecret).mockResolvedValue("secret-abc");

    // Different length exercises the length guard before timingSafeEqual.
    expect(await validatePlayerToken("game-1", "A1NS", "short")).toBe(false);
  });

  it("returns false when no participant is seated (no stored secret)", async () => {
    vi.mocked(findParticipantSecret).mockResolvedValue(null);

    expect(await validatePlayerToken("game-1", "A1NS", "any-token")).toBe(
      false,
    );
  });

  it("returns false when the lookup throws", async () => {
    vi.mocked(findParticipantSecret).mockRejectedValue(new Error("DB failure"));

    expect(await validatePlayerToken("game-1", "A1NS", "any-token")).toBe(
      false,
    );
  });
});

describe("assertPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
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
    expect(console.warn).toHaveBeenCalledTimes(1);
    // The warning names the game and seat but never the token value.
    const warnArg = vi.mocked(console.warn).mock.calls[0][0] as string;
    expect(warnArg).toContain("game-1");
    expect(warnArg).toContain("A1NS");
    expect(warnArg).not.toContain("wrong");
  });

  it("does not invoke the callback or warn for a valid token", async () => {
    vi.mocked(findParticipantSecret).mockResolvedValue("secret-abc");
    const cb = vi.fn();

    await assertPlayer("game-1", "A1NS", "secret-abc", cb);

    expect(cb).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
