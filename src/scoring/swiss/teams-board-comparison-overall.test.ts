import { describe, expect, it } from "vitest";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import {
  calculateTeamsBamOverall,
  calculateTeamsPabOverall,
} from "./teams-board-comparison-overall";

function row(overrides: Partial<SwissVpBoardRow>): SwissVpBoardRow {
  return {
    section: "A",
    roundNumber: 1,
    tableNumber: 1,
    boardNumber: 1,
    ns: "A1NS",
    ew: "A2EW",
    confirmedResult: null,
    directorOverrideResult: null,
    status: "COMPLETE",
    ...overrides,
  };
}

describe("calculateTeamsBamOverall", () => {
  it("returns empty, well-formed metadata for no rows", () => {
    const result = calculateTeamsBamOverall([], { barometer: true });
    expect(result.type).toBe("TEAM_BAM");
    expect(result.mode).toBe("TEAM");
    expect(result.scoring).toBe("BAM");
    expect(result.barometer).toBe(true);
    expect(result.lines).toHaveLength(0);
  });

  it("carries the barometer flag through", () => {
    expect(
      calculateTeamsBamOverall([], { barometer: false }).barometer,
    ).toBe(false);
  });

  it("credits the two teams complementary boards over a match", () => {
    // Match {team 1, team 2} across tables 1 and 2, one round of 3 boards.
    //  Board 1: team 1 NS 4S= (420) vs team 2 NS 3NT= (400) -> team 1 wins.
    //  Board 2: both 3NT= (400 v 400)                        -> tie.
    //  Board 3: team 1 NS 3NT= (400) vs team 2 NS 4S= (420) -> team 2 wins.
    // Team 1 wins 1 + ties 0.5 = 1.5 of 3; team 2 wins the complement 1.5 of 3.
    const rows: SwissVpBoardRow[] = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "4SN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 2, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 3, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 3, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "4SN=" }),
    ];

    const result = calculateTeamsBamOverall(rows, { barometer: true });

    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;

    expect(t1.byRound[1]).toEqual({ won: 1.5, played: 3 });
    expect(t2.byRound[1]).toEqual({ won: 1.5, played: 3 });
    expect(t1.totalWon).toBe(1.5);
    expect(t1.totalPlayed).toBe(3);
    // The two teams' wins sum to the boards played each round.
    expect(t1.byRound[1].won + t2.byRound[1].won).toBe(3);
  });

  it("ranks teams by total boards won and accumulates across rounds", () => {
    // Round 1: team 1 sweeps both boards vs team 2 (2-0).
    // Round 2: team 1 beats team 3 on one board of one (1-0).
    const rows: SwissVpBoardRow[] = [
      // Round 1: 1 v 2, boards 1-2, team 1 wins both.
      row({ roundNumber: 1, boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "4SN=" }),
      row({ roundNumber: 1, boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ roundNumber: 1, boardNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "4SN=" }),
      row({ roundNumber: 1, boardNumber: 2, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      // Round 2: 1 v 3, board 3, team 1 wins.
      row({ roundNumber: 2, boardNumber: 3, tableNumber: 1, ns: "A1NS", ew: "A3EW", confirmedResult: "4SN=" }),
      row({ roundNumber: 2, boardNumber: 3, tableNumber: 3, ns: "A3NS", ew: "A1EW", confirmedResult: "3NTN=" }),
    ];

    const result = calculateTeamsBamOverall(rows, { barometer: true });

    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    expect(t1.totalWon).toBe(3); // 2 in round 1 + 1 in round 2
    expect(t1.totalPlayed).toBe(3);
    expect(t1.byRound[1]).toEqual({ won: 2, played: 2 });
    expect(t1.byRound[2]).toEqual({ won: 1, played: 1 });

    // Team 1 leads the field.
    expect(result.lines[0].teamId).toBe("A1NS");
    expect(result.lines[0].rank).toBe(1);
  });

  it("credits nothing for a match with no comparable board yet", () => {
    // Only the home room has a result; the closed room is unentered.
    const rows: SwissVpBoardRow[] = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "4SN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: null }),
    ];

    const result = calculateTeamsBamOverall(rows, { barometer: false });

    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    expect(t1.byRound[1]).toEqual({ won: 0, played: 0 });
    expect(t2.byRound[1]).toEqual({ won: 0, played: 0 });
    expect(t1.totalWon).toBe(0);
    expect(t1.totalPlayed).toBe(0);
  });
});

describe("calculateTeamsPabOverall", () => {
  it("produces the same board-unit standings as BAM but tagged PAB", () => {
    // Team 1 (home) wins board 1 (420 > 400) and ties board 2 (400 = 400):
    // 1.5 boards of 2 in native units — identical to the BAM figures; only the
    // type/scoring tag differs (the ×2 scale is applied by the view/export).
    const rows = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "4SN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 2, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
    ];

    const result = calculateTeamsPabOverall(rows, { barometer: true });

    expect(result.type).toBe("TEAM_PAB");
    expect(result.mode).toBe("TEAM");
    expect(result.scoring).toBe("PAB");
    expect(result.barometer).toBe(true);

    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    // Native board units, unchanged from BAM.
    expect(t1.totalWon).toBe(1.5);
    expect(t1.totalPlayed).toBe(2);
    expect(t1.byRound[1]).toEqual({ won: 1.5, played: 2 });
  });

  it("carries a false barometer flag through", () => {
    expect(calculateTeamsPabOverall([], { barometer: false }).barometer).toBe(
      false,
    );
  });
});

describe("board-comparison bye credit", () => {
  it("credits a bye team 60% of the round's boards (BAM native units)", () => {
    // Teams 1 v 2 play a 2-board round; team 3 sits out (SIT_OUT on its home
    // table, phantom opponent), across the same 2 boards.
    const rows = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 2, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 1, tableNumber: 3, ns: "A3NS", ew: "PHANTOM", confirmedResult: null, status: "SIT_OUT" }),
      row({ boardNumber: 2, tableNumber: 3, ns: "A3NS", ew: "PHANTOM", confirmedResult: null, status: "SIT_OUT" }),
    ];

    const result = calculateTeamsBamOverall(rows, { barometer: true });
    const bye = result.lines.find((l) => l.teamId === "A3NS")!;
    // 60% of 2 boards = 1.2 won of 2 played (native board units).
    expect(bye.byRound[1]).toEqual({ won: 1.2, played: 2 });
    expect(bye.totalWon).toBe(1.2);
    expect(bye.totalPlayed).toBe(2);
  });

  it("credits the same native bye units regardless of BAM/PAB scale", () => {
    const rows = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 1, tableNumber: 3, ns: "A3NS", ew: "PHANTOM", confirmedResult: null, status: "SIT_OUT" }),
    ];

    const bam = calculateTeamsBamOverall(rows, { barometer: true });
    const pab = calculateTeamsPabOverall(rows, { barometer: true });
    // Native units are scale-independent: 60% of 1 board = 0.6 either way.
    expect(bam.lines.find((l) => l.teamId === "A3NS")!.totalWon).toBe(0.6);
    expect(pab.lines.find((l) => l.teamId === "A3NS")!.totalWon).toBe(0.6);
  });
});
