import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setDirectorToken,
  getDirectorToken,
  clearDirectorToken,
  isDirectorFor,
  verifyDirectorTokenWithServer,
  heldDirectorTokens,
  DIRECTOR_TOKENS_CHANGED,
} from "./director-token";

describe("director-token", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("setDirectorToken", () => {
    it("stores a token in localStorage keyed by gameId", () => {
      setDirectorToken("game-1", "token-abc");
      expect(localStorage.getItem("director:game-1")).toBe("token-abc");
    });

    it("can store tokens for multiple games", () => {
      setDirectorToken("game-1", "token-1");
      setDirectorToken("game-2", "token-2");
      expect(localStorage.getItem("director:game-1")).toBe("token-1");
      expect(localStorage.getItem("director:game-2")).toBe("token-2");
    });

    it("overwrites existing token for same gameId", () => {
      setDirectorToken("game-1", "old-token");
      setDirectorToken("game-1", "new-token");
      expect(localStorage.getItem("director:game-1")).toBe("new-token");
    });
  });

  describe("getDirectorToken", () => {
    it("returns the stored token", () => {
      localStorage.setItem("director:game-1", "token-abc");
      expect(getDirectorToken("game-1")).toBe("token-abc");
    });

    it("returns null when no token exists", () => {
      expect(getDirectorToken("nonexistent")).toBeNull();
    });
  });

  describe("clearDirectorToken", () => {
    it("removes the token from localStorage", () => {
      localStorage.setItem("director:game-1", "token-abc");
      clearDirectorToken("game-1");
      expect(localStorage.getItem("director:game-1")).toBeNull();
    });

    it("does not throw when clearing a non-existent token", () => {
      expect(() => clearDirectorToken("nonexistent")).not.toThrow();
    });
  });

  describe("isDirectorFor", () => {
    it("returns true when a token exists for the game", () => {
      localStorage.setItem("director:game-1", "token-abc");
      expect(isDirectorFor("game-1")).toBe(true);
    });

    it("returns false when no token exists for the game", () => {
      expect(isDirectorFor("game-1")).toBe(false);
    });

    it("returns false after token is cleared", () => {
      localStorage.setItem("director:game-1", "token-abc");
      localStorage.removeItem("director:game-1");
      expect(isDirectorFor("game-1")).toBe(false);
    });
  });

  describe("verifyDirectorTokenWithServer", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("returns false without calling the server when no token is stored", async () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      await expect(verifyDirectorTokenWithServer("game-1")).resolves.toBe(
        false,
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("returns true and keeps the token when the server confirms it", async () => {
      setDirectorToken("game-1", "good");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, status: 200 }),
      );

      await expect(verifyDirectorTokenWithServer("game-1")).resolves.toBe(true);
      expect(getDirectorToken("game-1")).toBe("good");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/games/game-1/director/validate",
        expect.objectContaining({ headers: { "x-director-token": "good" } }),
      );
    });

    it("clears the stale token and returns false on a 401", async () => {
      setDirectorToken("game-1", "stale");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 401 }),
      );

      await expect(verifyDirectorTokenWithServer("game-1")).resolves.toBe(
        false,
      );
      expect(getDirectorToken("game-1")).toBeNull();
    });

    it("returns false but keeps the token on a transient network error", async () => {
      setDirectorToken("game-1", "maybe-valid");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

      await expect(verifyDirectorTokenWithServer("game-1")).resolves.toBe(
        false,
      );
      expect(getDirectorToken("game-1")).toBe("maybe-valid");
    });
  });

  describe("heldDirectorTokens", () => {
    it("lists every game this device directs, and nothing else", () => {
      setDirectorToken("g1", "t1");
      setDirectorToken("g2", "t2");
      localStorage.setItem("player:g1", "{}");
      expect(
        heldDirectorTokens().sort((a, b) => a.gameId.localeCompare(b.gameId)),
      ).toEqual([
        { gameId: "g1", directorToken: "t1" },
        { gameId: "g2", directorToken: "t2" },
      ]);
    });
  });

  it("announces when this device gains or loses a director token", () => {
    const listener = vi.fn();
    window.addEventListener(DIRECTOR_TOKENS_CHANGED, listener);
    try {
      setDirectorToken("g1", "t1");
      clearDirectorToken("g1");
      expect(listener).toHaveBeenCalledTimes(2);
    } finally {
      window.removeEventListener(DIRECTOR_TOKENS_CHANGED, listener);
    }
  });

  it("doesn't try to announce a change outside a browser", () => {
    vi.stubGlobal("window", undefined);
    try {
      expect(() => setDirectorToken("g1", "t1")).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(getDirectorToken("g1")).toBe("t1");
  });
});
