import { describe, it, expect } from "vitest";
import { swrKeys } from "./swr-keys";

describe("swrKeys", () => {
  it("pairs returns correct API path", () => {
    expect(swrKeys.pairs("g1")).toBe("/api/games/pairs/g1/pairs");
  });

  it("joinableGames returns static path", () => {
    expect(swrKeys.joinableGames()).toBe("/api/games/joinable");
  });

  it("game returns correct API path", () => {
    expect(swrKeys.game("abc")).toBe("/api/games/abc");
  });

  it("assignment returns correct API path", () => {
    expect(swrKeys.assignment("g1", "p1")).toBe("/api/games/g1/assignment/p1");
  });
});
