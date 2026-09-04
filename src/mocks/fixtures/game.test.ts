import { describe, it, expect } from "vitest";

import { mockGame, pairsGame4Tables, teamsGame4Tables } from "./game";

describe("game fixtures", () => {
  it("mockGame is an 8-table MP pairs game", () => {
    expect(mockGame.gameType).toBe("PAIRS");
    expect(mockGame.scoringType).toBe("MP");
    expect(mockGame.tables).toBe(8);
    expect(mockGame.gameId).toBe("abc123");
  });

  it("pairsGame4Tables overrides only the table count", () => {
    expect(pairsGame4Tables.tables).toBe(4);
    expect(pairsGame4Tables.gameType).toBe("PAIRS");
    expect(pairsGame4Tables.eventName).toBe(mockGame.eventName);
  });

  it("teamsGame4Tables is an IMP teams game with 4 tables", () => {
    expect(teamsGame4Tables.gameType).toBe("TEAMS");
    expect(teamsGame4Tables.scoringType).toBe("IMP");
    expect(teamsGame4Tables.tables).toBe(4);
  });
});
