import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games/queries/find-participant-secret", () => ({
  findParticipantSecret: vi.fn(),
}));

import { findParticipantSecret } from "@/db/games/queries/find-participant-secret";
import { validatePlayerToken } from "./player-token";

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
