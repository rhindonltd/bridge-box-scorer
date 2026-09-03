import { describe, it, expect, beforeEach } from "vitest";

import {
  setPlayerToken,
  getPlayerToken,
  clearPlayerToken,
} from "./player-token";

describe("player token store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no token is stored for the game", () => {
    expect(getPlayerToken("g1")).toBeNull();
  });

  it("round-trips a token keyed by gameId", () => {
    setPlayerToken("g1", { startingPosition: "A1NS", token: "tok-1" });

    expect(getPlayerToken("g1")).toEqual({
      startingPosition: "A1NS",
      token: "tok-1",
    });
  });

  it("keeps tokens for different games separate", () => {
    setPlayerToken("g1", { startingPosition: "A1NS", token: "tok-1" });
    setPlayerToken("g2", { startingPosition: "B2EW", token: "tok-2" });

    expect(getPlayerToken("g1")?.token).toBe("tok-1");
    expect(getPlayerToken("g2")?.token).toBe("tok-2");
  });

  it("stores under the player:<gameId> key", () => {
    setPlayerToken("g1", { startingPosition: "A1NS", token: "tok-1" });
    expect(localStorage.getItem("player:g1")).not.toBeNull();
  });

  it("clears only the targeted game token", () => {
    setPlayerToken("g1", { startingPosition: "A1NS", token: "tok-1" });
    setPlayerToken("g2", { startingPosition: "B2EW", token: "tok-2" });

    clearPlayerToken("g1");

    expect(getPlayerToken("g1")).toBeNull();
    expect(getPlayerToken("g2")?.token).toBe("tok-2");
  });
});
