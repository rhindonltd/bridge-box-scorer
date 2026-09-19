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
    expect(swrKeys.playerSearch("de la")).toBe("/api/players/search?q=de%20la");
  });

  it("wifiScan returns static path", () => {
    expect(swrKeys.wifiScan()).toBe("/api/system/wifi/scan");
  });

  it("wifiDiagnostics returns static path", () => {
    expect(swrKeys.wifiDiagnostics()).toBe("/api/system/wifi/diagnostics");
  });

  it("adminKeyValidate returns static path", () => {
    expect(swrKeys.adminKeyValidate()).toBe("/api/system/admin-key/validate");
  });

  it("directorValidate embeds the gameId", () => {
    expect(swrKeys.directorValidate("g1")).toBe(
      "/api/games/g1/director/validate",
    );
  });

  it("movementDetail embeds the type and id", () => {
    expect(swrKeys.movementDetail("mitchell", 7)).toBe(
      "/api/movements/detail/mitchell/7",
    );
  });

  it("resultsSummary returns correct API path", () => {
    expect(swrKeys.resultsSummary("g1")).toBe("/api/games/g1/results-summary");
  });

  it("bridgewebs returns static path", () => {
    expect(swrKeys.bridgewebs()).toBe("/api/system/bridgewebs");
  });

  it("bridgewebsEvents URL-encodes the date", () => {
    expect(swrKeys.bridgewebsEvents("2024/01/02")).toBe(
      "/api/games/bridgewebs/events?date=2024%2F01%2F02",
    );
  });

  it("network returns static path", () => {
    expect(swrKeys.network()).toBe("/api/system/network");
  });
});
