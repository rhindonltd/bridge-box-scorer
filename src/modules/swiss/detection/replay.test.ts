import { describe, it, expect } from "vitest";
import {
  detectSwissTeamsMismatches,
  ruledMismatches,
  teamsRoundToAssess,
} from "./replay";
import type { SwissTeamsCommittedRound } from "@/modules/swiss/teams/history";
import { withMismatch } from "@/model/swiss-mismatch";

const emptyRound: SwissTeamsCommittedRound = {
  roundNumber: 2,
  opponentByTeam: new Map(),
  homeTableByTeam: new Map(),
  excludedTeams: new Set(),
  triples: [],
};

describe("detectSwissTeamsMismatches", () => {
  it("skips a round with no ordinary tables and no triple", () => {
    expect(teamsRoundToAssess(emptyRound)).toBe(false);
    expect(
      detectSwissTeamsMismatches(
        "A",
        { teams: 4, boardsPerRound: 2 },
        [
          {
            roundNumber: 2,
            standingsAsOf: [1, 2, 3, 4],
            prior: { playedOpponents: new Set(), hadTriple: new Set() },
            committed: emptyRound,
          },
        ],
        new Map(),
        [],
      ),
    ).toEqual([]);
  });
});

describe("ruledMismatches", () => {
  it("records each ruled side with its round and board range", () => {
    const rows = [
      {
        roundNumber: 2,
        home: "A1",
        opponent: "A3",
        boardStart: 3,
        boardEnd: 4,
        ruling: withMismatch(null, {
          side: "NS",
          direction: "HIGHER",
          fault: "NOT",
        }),
      },
      // No ruling, or a side whose id does not decode: nothing recorded.
      {
        roundNumber: 2,
        home: "A2",
        opponent: null,
        boardStart: 3,
        boardEnd: 4,
        ruling: null,
      },
    ];
    expect(
      ruledMismatches(rows, (p) => (p === "A1" ? 1 : p === "A3" ? 3 : null)),
    ).toEqual([{ round: 2, id: 1, boardStart: 3, boardEnd: 4 }]);
  });
});
