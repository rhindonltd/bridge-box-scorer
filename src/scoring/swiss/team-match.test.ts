import { describe, it, expect } from "vitest";
import {
  boardResult,
  teamIdFor,
  groupTeamMatches,
  teamMatchBoardImps,
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
