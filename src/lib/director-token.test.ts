import { describe, it, expect, beforeEach } from "vitest";
import {
  setDirectorToken,
  getDirectorToken,
  clearDirectorToken,
  isDirectorFor,
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
});
