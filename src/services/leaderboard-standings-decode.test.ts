import { describe, it, expect } from "vitest";
import {
  decodeStandingsOrder,
  decodeVpById,
  pairLeaderboardDecoder,
  teamLeaderboardDecoder,
} from "./leaderboard-standings-decode";
import type { SectionLeaderboard } from "@/services/leaderboard-service";

/** A section leaderboard carrying just the given overall lines. */
function boardWith(lines: Record<string, unknown>[]): SectionLeaderboard {
  return { section: "A", overallScore: { lines } } as never;
}

describe("teamLeaderboardDecoder", () => {
  it("decodes a home NS seat to its table number", () => {
    expect(teamLeaderboardDecoder.decode({ teamId: "A3NS" })).toBe(3);
  });

  it("decodes a non-seat id to null", () => {
    expect(teamLeaderboardDecoder.decode({ teamId: "not-a-seat" })).toBeNull();
  });
});

describe("pairLeaderboardDecoder", () => {
  it("decodes a pair's board id to its stable pair number", () => {
    expect(pairLeaderboardDecoder(3).decode({ pairId: "A2" })).toBe(2);
  });

  it("decodes an unrecognised id to null", () => {
    expect(pairLeaderboardDecoder(3).decode({ pairId: "???" })).toBeNull();
  });
});

describe("decodeStandingsOrder", () => {
  it("is empty without a board", () => {
    expect(decodeStandingsOrder(undefined, teamLeaderboardDecoder)).toEqual([]);
  });

  it("keeps ranked order, dropping duplicates and undecodable lines", () => {
    const board = boardWith([
      { teamId: "A2NS" },
      { teamId: "garbage" },
      { teamId: "A1NS" },
      { teamId: "A2NS" },
    ]);
    expect(decodeStandingsOrder(board, teamLeaderboardDecoder)).toEqual([2, 1]);
  });
});

describe("decodeVpById", () => {
  it("is empty without a board", () => {
    expect(decodeVpById(undefined, teamLeaderboardDecoder).size).toBe(0);
  });

  it("maps each id to its total VP, defaulting to 0 and skipping undecodable lines", () => {
    const board = boardWith([
      { teamId: "A1NS", totalVP: 12.5 },
      { teamId: "A2NS" },
      { teamId: "garbage", totalVP: 99 },
    ]);
    expect(decodeVpById(board, teamLeaderboardDecoder)).toEqual(
      new Map([
        [1, 12.5],
        [2, 0],
      ]),
    );
  });
});
