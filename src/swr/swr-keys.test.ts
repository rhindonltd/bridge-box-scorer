import { describe, it, expect } from "vitest";
import { swrKeys } from "./swr-keys";

describe("swrKeys", () => {
  it("pairs returns correct API path", () => {
    expect(swrKeys.pairs("g1")).toBe("/api/games/g1/participants");
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

  it("startCheck returns correct API path", () => {
    expect(swrKeys.startCheck("g1")).toBe("/api/games/g1/start-check");
  });

  it("sections returns correct API path", () => {
    expect(swrKeys.sections("g1")).toBe("/api/games/g1/sections");
  });

  it("schedule returns correct API path", () => {
    expect(swrKeys.schedule("g1", "A1NS")).toBe("/api/games/g1/schedule/A1NS");
  });

  it("boards returns correct API path", () => {
    expect(swrKeys.boards("g1")).toBe("/api/games/g1/boards");
  });

  it("club returns static path", () => {
    expect(swrKeys.club()).toBe("/api/system/club");
  });

  it("playerSearch URL-encodes the query", () => {
    expect(swrKeys.playerSearch("de la")).toBe(
      "/api/players/search?q=de%20la",
    );
  });

  it("wifiScan returns static path", () => {
    expect(swrKeys.wifiScan()).toBe("/api/system/wifi/scan");
  });
});
