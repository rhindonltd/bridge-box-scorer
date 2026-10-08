import { describe, it, expect } from "vitest";
import {
  boardResult,
  teamIdFor,
  groupTeamMatches,
  groupTeamTriples,
  tripleTeamStakes,
  tripleVpPool,
  teamByeRounds,
  teamMatchBoardImps,
  teamMatchBoardWins,
  type TeamMatchRow,
} from "./team-match";
import type { BoardOutcome } from "@/model/score";

function row(
  round: number,
  boardNumber: number,
  ns: string,
  ew: string,
  outcome: BoardOutcome | null,
  overrides: Partial<TeamMatchRow> = {},
): TeamMatchRow {
  return {
    section: "A",
    roundNumber: round,
    boardNumber,
    ns,
    ew,
    confirmedResult: outcome,
    directorOverrideResult: null,
    status: "CONFIRMED",
    ...overrides,
  };
}

describe("boardResult", () => {
  it("prefers the director override over the confirmed result", () => {
    expect(
      boardResult(
        row(1, 1, "A1NS", "A2EW", "3NTN=" as BoardOutcome, {
          directorOverrideResult: "4SN=" as BoardOutcome,
        }),
      ),
    ).toBe("4SN=");
  });

  it("uses the confirmed result when there is no override", () => {
    expect(
      boardResult(row(1, 1, "A1NS", "A2EW", "3NTN=" as BoardOutcome)),
    ).toBe("3NTN=");
  });

  it("is null when neither is present", () => {
    expect(boardResult(row(1, 1, "A1NS", "A2EW", null))).toBeNull();
  });
});

describe("teamIdFor", () => {
  it("builds the home NS seat id", () => {
    expect(teamIdFor("A", 1)).toBe("A1NS");
    expect(teamIdFor("B", 3)).toBe("B3NS");
  });
});

describe("groupTeamMatches", () => {
  it("pairs the two home tables of a match, keyed on the lower table", () => {
    // Team 1 home (table 1): A1NS vs A2EW. Team 2 home (table 2): A2NS vs A1EW.
    // Both rooms play the same board (board 1).
    const rows = [
      row(1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const matches = groupTeamMatches(rows);

    expect(matches).toHaveLength(1);
    const m = matches[0];
    expect(m.homeTable).toBe(1);
    expect(m.opponentTable).toBe(2);
    expect(m.homeTeamId).toBe("A1NS");
    expect(m.opponentTeamId).toBe("A2NS");
    expect([...m.homeRowsByBoard.keys()]).toEqual([1]);
    expect([...m.opponentRowsByBoard.keys()]).toEqual([1]);
  });

  it("skips SIT_OUT rows", () => {
    const rows = [{ ...row(1, 1, "A1NS", "A2EW", null), status: "SIT_OUT" }];
    expect(groupTeamMatches(rows)).toHaveLength(0);
  });

  it("orders matches by round, then section, then home table", () => {
    const rows = [
      // Round 2, tables 1 v 2.
      row(2, 3, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      row(2, 3, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      // Round 1, tables 3 v 4.
      row(1, 1, "A3NS", "A4EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A4NS", "A3EW", "3NTN=" as BoardOutcome),
      // Round 1, tables 1 v 2.
      row(1, 1, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];

    const matches = groupTeamMatches(rows);
    expect(
      matches.map((m) => `${m.round}:${m.homeTable}v${m.opponentTable}`),
    ).toEqual(["1:1v2", "1:3v4", "2:1v2"]);
  });

  it("breaks ties within a round by section letter", () => {
    // Same round and home table across two sections: section A must sort
    // before section B.
    const rows = [
      row(1, 1, "B1NS", "B2EW", "3NTN=" as BoardOutcome, { section: "B" }),
      row(1, 1, "B2NS", "B1EW", "3NTN=" as BoardOutcome, { section: "B" }),
      row(1, 1, "A1NS", "A2EW", "3NTN=" as BoardOutcome, { section: "A" }),
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome, { section: "A" }),
    ];

    const matches = groupTeamMatches(rows);
    expect(matches.map((m) => m.section)).toEqual(["A", "B"]);
  });
});

describe("teamMatchBoardImps", () => {
  it("computes per-board net IMPs and margin over boards both rooms scored", () => {
    // Board 1: home NS 4S= (None vul) = 420; opponent's home table NS 3NT= = 400.
    // Net for the primary team = 420 - 400 = +20 -> IMPs(20) = 1.
    const rows = [
      row(1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];
    const [match] = groupTeamMatches(rows);

    const { perBoard, margin, boardsPlayed } = teamMatchBoardImps(match);
    expect(perBoard).toEqual([{ boardNumber: 1, imps: 1 }]);
    expect(margin).toBe(1);
    expect(boardsPlayed).toBe(1);
  });

  it("counts a board only when both rooms have a comparable result", () => {
    // Only the home table has a result; the opponent room is unentered.
    const rows = [
      row(1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", null),
    ];
    const [match] = groupTeamMatches(rows);

    const { perBoard, margin, boardsPlayed } = teamMatchBoardImps(match);
    expect(perBoard).toEqual([{ boardNumber: 1, imps: null }]);
    expect(margin).toBe(0);
    expect(boardsPlayed).toBe(0);
  });

  it("defaults the opponent room to empty when its table has no rows", () => {
    // Only the home table (1) has any rows; the opponent table (2) was never
    // entered, so its rows-by-board map defaults to empty and no board counts.
    const rows = [row(1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome)];
    const [match] = groupTeamMatches(rows);

    expect(match.opponentRowsByBoard.size).toBe(0);
    const { perBoard, margin, boardsPlayed } = teamMatchBoardImps(match);
    expect(perBoard).toEqual([{ boardNumber: 1, imps: null }]);
    expect(margin).toBe(0);
    expect(boardsPlayed).toBe(0);
  });

  it("lists every board either room has a row for, in ascending order", () => {
    const rows = [
      row(1, 2, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      row(1, 2, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];
    const [match] = groupTeamMatches(rows);

    const { perBoard } = teamMatchBoardImps(match);
    expect(perBoard.map((b) => b.boardNumber)).toEqual([1, 2]);
  });
});

describe("teamMatchBoardWins", () => {
  it("scores each board as a win (1), tie (0.5) or loss (0) for the home team", () => {
    // Board 1: home NS 4S= (420) vs opponent home NS 3NT= (400) -> home wins.
    // Board 2: both rooms 3NT= (400 vs 400) -> tie.
    // Board 3: home NS 3NT= (400) vs opponent home NS 4S= (420) -> home loses.
    const rows = [
      row(1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      row(1, 2, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      row(1, 2, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      row(1, 3, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      row(1, 3, "A2NS", "A1EW", "4SN=" as BoardOutcome),
    ];
    const [match] = groupTeamMatches(rows);

    const { perBoard, won, boardsPlayed } = teamMatchBoardWins(match);
    expect(perBoard).toEqual([
      { boardNumber: 1, result: 1 },
      { boardNumber: 2, result: 0.5 },
      { boardNumber: 3, result: 0 },
    ]);
    expect(won).toBe(1.5);
    expect(boardsPlayed).toBe(3);
  });

  it("skips a board that only one room has scored (not comparable)", () => {
    const rows = [
      row(1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", null),
    ];
    const [match] = groupTeamMatches(rows);

    const { perBoard, won, boardsPlayed } = teamMatchBoardWins(match);
    expect(perBoard).toEqual([{ boardNumber: 1, result: null }]);
    expect(won).toBe(0);
    expect(boardsPlayed).toBe(0);
  });

  it("uses the same primary/home perspective as groupTeamMatches", () => {
    // The match is keyed on the lower table (1) as home. Board 1: table 1 NS
    // 4S= (420) beats table 2 NS 3NT= (400), so the home team wins the board
    // regardless of the row insertion order.
    const rows = [
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
    ];
    const [match] = groupTeamMatches(rows);

    expect(match.homeTable).toBe(1);
    const { won, boardsPlayed } = teamMatchBoardWins(match);
    expect(won).toBe(1);
    expect(boardsPlayed).toBe(1);
  });

  it("§3.3.7: a removed board is a win for the home team when opponents are at fault", () => {
    const rows = [
      row(1, 1, "A1NS", "A2EW", null, {
        status: "REMOVED_TEAMS",
        directorOverrideResult: "TRM:EW_FAULT" as BoardOutcome,
      }),
    ];
    const [match] = groupTeamMatches(rows);
    const { perBoard, won, boardsPlayed } = teamMatchBoardWins(match);
    expect(perBoard).toEqual([{ boardNumber: 1, result: 1 }]);
    expect(won).toBe(1);
    expect(boardsPlayed).toBe(1);
  });

  it("§3.3.7: a removed board is a loss when the home table is at fault", () => {
    const rows = [
      row(1, 1, "A1NS", "A2EW", null, {
        status: "REMOVED_TEAMS",
        directorOverrideResult: "TRM:NS_FAULT" as BoardOutcome,
      }),
    ];
    const [match] = groupTeamMatches(rows);
    const { won } = teamMatchBoardWins(match);
    expect(won).toBe(0);
  });

  it("§3.3.7: a removed board is a tie for neither-/both-at-fault", () => {
    const rows = [
      row(1, 1, "A1NS", "A2EW", null, {
        status: "REMOVED_TEAMS",
        directorOverrideResult: "TRM:BOTH_FAULT" as BoardOutcome,
      }),
    ];
    const [match] = groupTeamMatches(rows);
    const { won, boardsPlayed } = teamMatchBoardWins(match);
    expect(won).toBe(0.5);
    expect(boardsPlayed).toBe(1);
  });
});

describe("teamByeRounds", () => {
  it("recovers a bye team, round and board count from SIT_OUT rows", () => {
    // Team at table 3 sits out round 1 over 2 boards (phantom opponent).
    const rows = [
      row(1, 1, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A3NS", "PHANTOM", null, { status: "SIT_OUT" }),
      row(1, 2, "A3NS", "PHANTOM", null, { status: "SIT_OUT" }),
    ];

    const byes = teamByeRounds(rows);
    expect(byes).toEqual([{ teamId: "A3NS", round: 1, boards: 2 }]);
  });

  it("returns no byes when there are no SIT_OUT rows", () => {
    const rows = [
      row(1, 1, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];
    expect(teamByeRounds(rows)).toEqual([]);
  });

  it("recovers a distinct bye per round", () => {
    const rows = [
      row(1, 1, "A3NS", "PHANTOM", null, { status: "SIT_OUT" }),
      row(2, 2, "A2NS", "PHANTOM", null, { status: "SIT_OUT" }),
    ];
    const byes = teamByeRounds(rows).sort((a, b) => a.round - b.round);
    expect(byes).toEqual([
      { teamId: "A3NS", round: 1, boards: 1 },
      { teamId: "A2NS", round: 2, boards: 1 },
    ]);
  });
});

/**
 * A SHORT triple {1,2,3}, all in one round, as three head-to-head comparisons
 * on three disjoint one-board sets:
 *   - set A (board 1): 1·NS v 2 and 2·NS v 1  → comparison 1-2
 *   - set B (board 2): 2·NS v 3 and 3·NS v 2  → comparison 2-3
 *   - set C (board 3): 3·NS v 1 and 1·NS v 3  → comparison 1-3
 * `outcomes` keys the six rooms as [a1, a2, b1, b2, c1, c2].
 */
function shortTripleRows(
  round: number,
  outcomes: [
    BoardOutcome | null,
    BoardOutcome | null,
    BoardOutcome | null,
    BoardOutcome | null,
    BoardOutcome | null,
    BoardOutcome | null,
  ],
) {
  return [
    row(round, 1, "A1NS", "A2EW", outcomes[0]), // A: 1 v 2
    row(round, 1, "A2NS", "A1EW", outcomes[1]), // A mirror
    row(round, 2, "A2NS", "A3EW", outcomes[2]), // B: 2 v 3
    row(round, 2, "A3NS", "A2EW", outcomes[3]), // B mirror
    row(round, 3, "A3NS", "A1EW", outcomes[4]), // C: 3 v 1
    row(round, 3, "A1NS", "A3EW", outcomes[5]), // C mirror
  ];
}

/**
 * A LONG triple {1,2,3} over rounds R and R+1. The half-1 room of each
 * comparison is in round R, the half-2 (mirror) room in round R+1, both on the
 * same one-board set (A board 1, B board 2, C board 3):
 *   - A: 1·NS v 2 (R) + 2·NS v 1 (R+1)  → comparison 1-2
 *   - B: 2·NS v 3 (R) + 3·NS v 2 (R+1)  → comparison 2-3
 *   - C: 3·NS v 1 (R) + 1·NS v 3 (R+1)  → comparison 1-3
 */
function longTripleRows(
  firstRound: number,
  outcomes: [
    BoardOutcome | null,
    BoardOutcome | null,
    BoardOutcome | null,
    BoardOutcome | null,
    BoardOutcome | null,
    BoardOutcome | null,
  ],
) {
  const r2 = firstRound + 1;
  return [
    row(firstRound, 1, "A1NS", "A2EW", outcomes[0]), // A half-1 (R)
    row(r2, 1, "A2NS", "A1EW", outcomes[1]), // A half-2 (R+1)
    row(firstRound, 2, "A2NS", "A3EW", outcomes[2]), // B half-1 (R)
    row(r2, 2, "A3NS", "A2EW", outcomes[3]), // B half-2 (R+1)
    row(firstRound, 3, "A3NS", "A1EW", outcomes[4]), // C half-1 (R)
    row(r2, 3, "A1NS", "A3EW", outcomes[5]), // C half-2 (R+1)
  ];
}

describe("groupTeamTriples", () => {
  it("reconstructs a SHORT triple as its three head-to-head comparisons", () => {
    const rows = shortTripleRows(1, [
      "4SN=",
      "3NTN=",
      "4SN=",
      "3NTN=",
      "4SN=",
      "3NTN=",
    ]);
    const triples = groupTeamTriples(rows);

    expect(triples).toHaveLength(1);
    const [tri] = triples;
    expect(tri.round).toBe(1);
    expect(tri.section).toBe("A");
    expect(tri.kind).toBe("SHORT");
    expect(tri.rounds).toEqual([1]);
    expect(tri.tables.map((t) => t.table)).toEqual([1, 2, 3]);
    expect(tri.tables.map((t) => t.teamId)).toEqual(["A1NS", "A2NS", "A3NS"]);
    // Three comparisons in ascending (lo, hi) order: 1-2, 1-3, 2-3.
    expect(
      tri.comparisons.map((c) => `${c.homeTable}v${c.opponentTable}`),
    ).toEqual(["1v2", "1v3", "2v3"]);
  });

  it("reconstructs a LONG triple spanning two rounds as three comparisons", () => {
    const rows = longTripleRows(1, [
      "4SN=",
      "3NTN=",
      "4SN=",
      "3NTN=",
      "4SN=",
      "3NTN=",
    ]);
    const triples = groupTeamTriples(rows);

    expect(triples).toHaveLength(1);
    const [tri] = triples;
    expect(tri.kind).toBe("LONG");
    expect(tri.rounds).toEqual([1, 2]);
    expect(tri.tables.map((t) => t.table)).toEqual([1, 2, 3]);
    expect(
      tri.comparisons.map((c) => `${c.homeTable}v${c.opponentTable}`),
    ).toEqual(["1v2", "1v3", "2v3"]);
  });

  it("does not treat an ordinary two-table match as a triple", () => {
    // A table with a single mutual opponent is a head-to-head, not a triple.
    const rows = [
      row(1, 1, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];
    expect(groupTeamTriples(rows)).toHaveLength(0);
    expect(groupTeamMatches(rows)).toHaveLength(1);
  });

  it("keeps a SHORT triple out of the two-table match reconstruction", () => {
    const rows = shortTripleRows(1, [
      "4SN=",
      "3NTN=",
      "4SN=",
      "3NTN=",
      "4SN=",
      "3NTN=",
    ]);
    // The triple tables must NOT be mis-paired as head-to-head matches.
    expect(groupTeamMatches(rows)).toHaveLength(0);
  });

  it("reconstructs a triple alongside a normal match in the same round", () => {
    const rows = [
      ...shortTripleRows(1, [
        "4SN=",
        "3NTN=",
        "4SN=",
        "3NTN=",
        "4SN=",
        "3NTN=",
      ]),
      // A separate head-to-head 4 v 5 in the same round, on its own boards.
      row(1, 10, "A4NS", "A5EW", "3NTN=" as BoardOutcome),
      row(1, 10, "A5NS", "A4EW", "3NTN=" as BoardOutcome),
    ];
    expect(groupTeamTriples(rows)).toHaveLength(1);
    const matches = groupTeamMatches(rows);
    expect(matches).toHaveLength(1);
    expect(matches[0].homeTable).toBe(4);
  });

  it("scores each SHORT comparison as a normal two-team head-to-head", () => {
    // Set A board 1 (None vul): 1·NS 420 vs 2·NS 400 -> imps(20)=1 to team 1.
    // Set B board 2: 2·NS 420 vs 3·NS 400 -> 1 to team 2.
    // Set C board 3: 3·NS 420 vs 1·NS 400 -> 1 to team 3.
    const rows = shortTripleRows(1, [
      "4SN=", // A: 1·NS 420
      "3NTN=", // A: 2·NS 400
      "4SN=", // B: 2·NS 420
      "3NTN=", // B: 3·NS 400
      "4SN=", // C: 3·NS 420
      "3NTN=", // C: 1·NS 400
    ]);
    const [tri] = groupTeamTriples(rows);
    const [c12, c13, c23] = tri.comparisons;
    expect(teamMatchBoardImps(c12).margin).toBe(1); // 1 beats 2 by 1 imp
    // Comparison 1-3: home is table 1 (1·NS 400 on set C) vs 3·NS 420 -> -1.
    expect(teamMatchBoardImps(c13).margin).toBe(-1);
    expect(teamMatchBoardImps(c23).margin).toBe(1); // 2 beats 3 by 1 imp
  });
});

describe("tripleTeamStakes", () => {
  it("gives each SHORT team its two comparisons, both crediting the one round", () => {
    const rows = shortTripleRows(1, [
      "4SN=",
      "3NTN=",
      "4SN=",
      "3NTN=",
      "4SN=",
      "3NTN=",
    ]);
    const [tri] = groupTeamTriples(rows);
    const stakes = tripleTeamStakes(tri);

    // Six stakes (two per comparison); every stake credits round 1.
    expect(stakes).toHaveLength(6);
    expect(stakes.every((s) => s.round === 1)).toBe(true);
    // Each team appears in exactly two stakes.
    for (const id of ["A1NS", "A2NS", "A3NS"]) {
      expect(stakes.filter((s) => s.teamId === id)).toHaveLength(2);
    }
    expect(tripleVpPool(tri)).toBe(10);
  });

  it("splits a LONG team's two comparisons across R and R+1 by NS-host round", () => {
    const rows = longTripleRows(1, [
      "4SN=",
      "3NTN=",
      "4SN=",
      "3NTN=",
      "4SN=",
      "3NTN=",
    ]);
    const [tri] = groupTeamTriples(rows);
    const stakes = tripleTeamStakes(tri);

    expect(tripleVpPool(tri)).toBe(20);
    // Team 1 hosts team 2 in round 1 (set A half-1) and team 3 in round 2
    // (set C half-2), so its two stakes credit rounds 1 and 2 respectively.
    const t1 = stakes
      .filter((s) => s.teamId === "A1NS")
      .map((s) => s.round)
      .sort();
    expect(t1).toEqual([1, 2]);
    // Every team has one stake in each round (one VP per team per round).
    for (const id of ["A1NS", "A2NS", "A3NS"]) {
      const rounds = stakes
        .filter((s) => s.teamId === id)
        .map((s) => s.round)
        .sort();
      expect(rounds).toEqual([1, 2]);
    }
  });
});
