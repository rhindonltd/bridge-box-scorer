import { describe, it, expect } from "vitest";
import {
  boardResult,
  teamIdFor,
  groupTeamMatches,
  groupTeamTriangles,
  triangleSubMatches,
  triangleTeamImps,
  triangleTeamWins,
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
 * A triangle {1,2,3}: table 1 = A1NS/A2EW, table 2 = A2NS/A3EW, table 3 =
 * A3NS/A1EW (the directed 3-cycle). One shared board set.
 */
function triangleRows(
  round: number,
  board: number,
  outcomes: [BoardOutcome | null, BoardOutcome | null, BoardOutcome | null],
) {
  return [
    row(round, board, "A1NS", "A2EW", outcomes[0]),
    row(round, board, "A2NS", "A3EW", outcomes[1]),
    row(round, board, "A3NS", "A1EW", outcomes[2]),
  ];
}

describe("groupTeamTriangles", () => {
  it("reconstructs a three-cycle of tables as one triangle", () => {
    const rows = triangleRows(1, 1, ["4SN=", "3NTN=", "2SN="]);
    const triangles = groupTeamTriangles(rows);

    expect(triangles).toHaveLength(1);
    const [tri] = triangles;
    expect(tri.round).toBe(1);
    expect(tri.section).toBe("A");
    expect(tri.tables.map((t) => t.table)).toEqual([1, 2, 3]);
    expect(tri.tables.map((t) => t.teamId)).toEqual(["A1NS", "A2NS", "A3NS"]);
  });

  it("does not treat an ordinary two-table match as a triangle", () => {
    // Mutual references (1<->2) are a head-to-head, not a 3-cycle.
    const rows = [
      row(1, 1, "A1NS", "A2EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];
    expect(groupTeamTriangles(rows)).toHaveLength(0);
    // ...and groupTeamMatches still reconstructs the head-to-head.
    expect(groupTeamMatches(rows)).toHaveLength(1);
  });

  it("keeps a triangle out of the two-table match reconstruction", () => {
    const rows = triangleRows(1, 1, ["4SN=", "3NTN=", "2SN="]);
    // The triangle tables must NOT be mis-paired as head-to-head matches.
    expect(groupTeamMatches(rows)).toHaveLength(0);
  });

  it("reconstructs a triangle alongside a normal match in the same round", () => {
    const rows = [
      ...triangleRows(1, 1, ["4SN=", "3NTN=", "2SN="]),
      // A separate head-to-head 4 v 5 in the same round.
      row(1, 1, "A4NS", "A5EW", "3NTN=" as BoardOutcome),
      row(1, 1, "A5NS", "A4EW", "3NTN=" as BoardOutcome),
    ];
    expect(groupTeamTriangles(rows)).toHaveLength(1);
    const matches = groupTeamMatches(rows);
    expect(matches).toHaveLength(1);
    expect(matches[0].homeTable).toBe(4);
  });
});

describe("triangleTeamImps", () => {
  it("cross-IMPs each team against the other two tables per board", () => {
    // Board 1 (None vul): scores 420, 400, 110.
    // T1: imps(20)+imps(310) = 1+7 = 8; T2: imps(-20)+imps(290) = -1+7 = 6;
    // T3: imps(-310)+imps(-290) = -7-7 = -14. Sum is zero.
    const rows = triangleRows(1, 1, ["4SN=", "3NTN=", "2SN="]);
    const [tri] = groupTeamTriangles(rows);
    const { perTeam, boardsPlayed } = triangleTeamImps(tri);

    expect(boardsPlayed).toBe(1);
    expect(perTeam.map((t) => [t.teamId, t.crossImps])).toEqual([
      ["A1NS", 8],
      ["A2NS", 6],
      ["A3NS", -14],
    ]);
    expect(perTeam.reduce((s, t) => s + t.crossImps, 0)).toBe(0);
  });

  it("skips a board unless all three tables have a comparable score", () => {
    // Only two tables entered board 1 -> nothing counts yet.
    const rows = triangleRows(1, 1, ["4SN=", "3NTN=", null]);
    const [tri] = groupTeamTriangles(rows);
    const { perTeam, boardsPlayed } = triangleTeamImps(tri);
    expect(boardsPlayed).toBe(0);
    for (const t of perTeam) expect(t.crossImps).toBe(0);
  });
});

describe("triangleTeamWins", () => {
  it("sums win/tie/loss against each of the other two tables per board", () => {
    // Board 1: 420 > 400 > 110. T1 beats both (2), T2 beats one (1), T3 (0).
    const rows = triangleRows(1, 1, ["4SN=", "3NTN=", "2SN="]);
    const [tri] = groupTeamTriangles(rows);
    const { perTeam, boardsPlayed } = triangleTeamWins(tri);

    expect(boardsPlayed).toBe(1);
    expect(perTeam.map((t) => [t.teamId, t.won])).toEqual([
      ["A1NS", 2],
      ["A2NS", 1],
      ["A3NS", 0],
    ]);
    // Total board-points per board across the three teams is 3 (3 pairwise
    // comparisons, each worth 1 split between the two teams).
    expect(perTeam.reduce((s, t) => s + t.won, 0)).toBe(3);
  });

  it("splits a tie half each", () => {
    // All three score 400 -> every pairwise comparison is a tie (0.5 each).
    const rows = triangleRows(1, 1, ["3NTN=", "3NTN=", "3NTN="]);
    const [tri] = groupTeamTriangles(rows);
    const { perTeam } = triangleTeamWins(tri);
    for (const t of perTeam) expect(t.won).toBe(1); // 0.5 + 0.5
  });
});

describe("triangleSubMatches", () => {
  it("decomposes a triangle into its three head-to-head pairings", () => {
    const rows = triangleRows(1, 1, ["4SN=", "3NTN=", "2SN="]);
    const [tri] = groupTeamTriangles(rows);
    const subs = triangleSubMatches(tri);

    // Three pairings in ascending (home, opponent) order: 1-2, 1-3, 2-3.
    expect(
      subs.map((m) => `${m.homeTable}v${m.opponentTable}`),
    ).toEqual(["1v2", "1v3", "2v3"]);
    expect(subs.every((m) => m.round === 1 && m.section === "A")).toBe(true);
    // Team ids follow the home-NS convention.
    expect(subs.map((m) => m.homeTeamId)).toEqual(["A1NS", "A1NS", "A2NS"]);
  });

  it("yields head-to-head IMPs per pairing via teamMatchBoardImps", () => {
    // Board 1 (None): table1 420, table2 400, table3 110.
    // 1v2: imps(420-400)=imps(20)=1. 1v3: imps(420-110)=imps(310)=7.
    // 2v3: imps(400-110)=imps(290)=7.
    const rows = triangleRows(1, 1, ["4SN=", "3NTN=", "2SN="]);
    const [tri] = groupTeamTriangles(rows);
    const [ab, ac, bc] = triangleSubMatches(tri);

    expect(teamMatchBoardImps(ab).margin).toBe(1);
    expect(teamMatchBoardImps(ac).margin).toBe(7);
    expect(teamMatchBoardImps(bc).margin).toBe(7);
  });
});
