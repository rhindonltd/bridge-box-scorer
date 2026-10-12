import { describe, it, expect } from "vitest";
import {
  resolveStandings,
  type ParticipantStandingRow,
  type StandingBoardRow,
} from "./ranking-exclusions";

/** A board row at (ns, ew) on a given board, with or without a result. */
function board(
  boardNumber: number,
  ns: string,
  ew: string,
  played: boolean,
): StandingBoardRow {
  return {
    boardNumber,
    ns,
    ew,
    confirmedResult: played ? "3NTN=" : null,
    directorOverrideResult: null,
  };
}

/**
 * A 4-board event where seat `late` has results on `boardsPlayed` of the four
 * boards (the LATE arrival's post-arrival boards), facing opponent "A2NS". The
 * other boards are its unplayed early cells.
 */
function fourBoardEvent(late: string, boardsPlayed: number): StandingBoardRow[] {
  const rows: StandingBoardRow[] = [];
  for (let b = 1; b <= 4; b++) {
    rows.push(board(b, late, "A2EW", b > 4 - boardsPlayed));
    // A second, always-played line per board so the field/top exists.
    rows.push(board(b, "A3NS", "A4EW", true));
  }
  return rows;
}

describe("resolveStandings — §2.4.7 LATE half-boards gate", () => {
  it("a LATE arrival present for at least half the boards RETAINS standing", () => {
    // 4 boards, played 2 (= half) → retains standing: not excluded, no credit.
    const rows: ParticipantStandingRow[] = [
      { seat: "A1NS", standing: "LATE", treatment: "REMOVE", finePercent: null },
    ];
    const boards = fourBoardEvent("A1NS", 2);

    const { excludedFromRanking, withdrawals } = resolveStandings(rows, boards);

    expect(excludedFromRanking.has("A1NS")).toBe(false);
    expect(withdrawals).toHaveLength(0);
  });

  it("a short LATE + REMOVE is excluded AND credited (unplayed early boards)", () => {
    // 4 boards, played 1 (< half) → scored per §2.4.6 like a REMOVE withdrawer.
    const rows: ParticipantStandingRow[] = [
      { seat: "A1NS", standing: "LATE", treatment: "REMOVE", finePercent: null },
    ];
    const boards = fourBoardEvent("A1NS", 1);

    const { excludedFromRanking, withdrawals } = resolveStandings(rows, boards);

    expect(excludedFromRanking.has("A1NS")).toBe(true);
    expect(withdrawals).toEqual([
      { seat: "A1NS", treatment: "REMOVE", finePercent: 0 },
    ]);
  });

  it("a short LATE + PENALISED stays in the ranking but is credited with its fine", () => {
    const rows: ParticipantStandingRow[] = [
      { seat: "A1NS", standing: "LATE", treatment: "PENALISED", finePercent: 10 },
    ];
    const boards = fourBoardEvent("A1NS", 1);

    const { excludedFromRanking, withdrawals } = resolveStandings(rows, boards);

    expect(excludedFromRanking.has("A1NS")).toBe(false);
    expect(withdrawals).toEqual([
      { seat: "A1NS", treatment: "PENALISED", finePercent: 10 },
    ]);
  });

  it("still treats WITHDRAWN and WITHOUT_STANDING exactly as before", () => {
    const rows: ParticipantStandingRow[] = [
      { seat: "A1NS", standing: "WITHDRAWN", treatment: "REMOVE", finePercent: null },
      { seat: "A2NS", standing: "WITHDRAWN", treatment: "PENALISED", finePercent: 20 },
      { seat: "A3NS", standing: "WITHOUT_STANDING", treatment: null, finePercent: null },
      { seat: "A4NS", standing: "ACTIVE", treatment: null, finePercent: null },
    ];
    const boards = fourBoardEvent("A1NS", 0);

    const { excludedFromRanking, withdrawals } = resolveStandings(rows, boards);

    // REMOVE withdrawal + without-standing are excluded; PENALISED + ACTIVE not.
    expect([...excludedFromRanking].sort()).toEqual(["A1NS", "A3NS"]);
    // Both withdrawers are credited; without-standing / active are not.
    expect(withdrawals.map((w) => w.seat).sort()).toEqual(["A1NS", "A2NS"]);
    expect(withdrawals.find((w) => w.seat === "A2NS")).toEqual({
      seat: "A2NS",
      treatment: "PENALISED",
      finePercent: 20,
    });
  });

  it("defaults a LATE/WITHDRAWN with no recorded treatment to REMOVE", () => {
    const rows: ParticipantStandingRow[] = [
      { seat: "A1NS", standing: "LATE", treatment: null, finePercent: null },
    ];
    const boards = fourBoardEvent("A1NS", 1); // short → treated as a withdrawer

    const { excludedFromRanking, withdrawals } = resolveStandings(rows, boards);

    expect(excludedFromRanking.has("A1NS")).toBe(true); // default REMOVE
    expect(withdrawals).toEqual([
      { seat: "A1NS", treatment: "REMOVE", finePercent: 0 },
    ]);
  });

  it("rounds the half threshold up (odd board count)", () => {
    // 3 boards: half = ceil(3/2) = 2. Played 2 → retains; played 1 → short.
    const threeBoards = (played: number): StandingBoardRow[] => {
      const rows: StandingBoardRow[] = [];
      for (let b = 1; b <= 3; b++) {
        rows.push(board(b, "A1NS", "A2EW", b > 3 - played));
        rows.push(board(b, "A3NS", "A4EW", true));
      }
      return rows;
    };
    const late: ParticipantStandingRow[] = [
      { seat: "A1NS", standing: "LATE", treatment: "REMOVE", finePercent: null },
    ];

    expect(
      resolveStandings(late, threeBoards(2)).withdrawals,
    ).toHaveLength(0); // 2 >= 2 → retains
    expect(
      resolveStandings(late, threeBoards(1)).withdrawals,
    ).toHaveLength(1); // 1 < 2 → short
  });
});
