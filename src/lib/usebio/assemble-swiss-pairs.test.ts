import { describe, it, expect } from "vitest";
import { assembleSwissPairs as assembleSwissPairsImpl } from "./assemble-swiss-pairs";
import { swissVpStructureFromRows } from "@/scoring/swiss/swiss-vp-test-structure";
import type { SwissRoundMode } from "@/scoring/swiss/swiss-vp-round";
import type { Board } from "@/db/games/tables/boards";
import type { Pair } from "@/model/participants";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Club } from "@/db/system/schema";
import type { BoardOutcome } from "@/model/score";
import type { Card } from "@/model/common";

// assembleSwissPairs now takes the PAIRS `matches` rows; derive them from each
// scenario's board rows via the test-only helper. Int tests cover the real path.
function assembleSwissPairs(
  g: BridgeGame,
  c: Club,
  pairs: Pair[],
  boardRows: Board[],
  mode: SwissRoundMode = "XIMP",
) {
  const { matchRows } = swissVpStructureFromRows(boardRows as never);
  return assembleSwissPairsImpl(g, c, pairs, boardRows, matchRows, mode);
}

const club: Club = { id: 1, name: "Test Club", clubNumber: "999" };

const game = {
  gameId: "g1",
  eventName: "Swiss Pairs",
  eventDate: "2024-11-18T00:00:00.000Z",
  gameType: "PAIRS",
  scoringType: "IMP",
  sectionName: "A",
} as BridgeGame;

function pair(seat: string, first: string): Pair {
  return {
    type: "PAIR",
    initialSeat: seat as Pair["initialSeat"],
    player1: { id: 1, firstName: first, lastName: "One", nationalId: null },
    player2: { id: 2, firstName: first, lastName: "Two", nationalId: null },
  };
}

function board(
  round: number,
  table: number,
  boardNumber: number,
  ns: string,
  ew: string,
  outcome: BoardOutcome | null,
  lead: Card | null = null,
): Board {
  return {
    section: "A",
    roundNumber: round,
    tableNumber: table,
    boardNumber,
    copy: "A",
    ns,
    ew,
    confirmedResult: outcome,
    confirmedLead: lead,
    directorOverrideResult: null,
    directorOverrideLead: null,
    status: "CONFIRMED",
    matchId: 1,
  } as Board;
}

/** A three-table round on one board with a spread of NS results (a real field). */
function threeTableRound(): Board[] {
  return [
    board(1, 1, 1, "A1NS", "A1EW", "6NTN=" as BoardOutcome), // field top (NS)
    board(1, 2, 1, "A2NS", "A2EW", "3NTN=" as BoardOutcome), // mid
    board(1, 3, 1, "A3NS", "A3EW", "3NTN-1" as BoardOutcome), // floor
  ];
}

describe("assembleSwissPairs", () => {
  it("emits SWISS_PAIRS data with a global pair roster", () => {
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = [board(1, 1, 1, "A1NS", "A1EW", "3NTN=" as BoardOutcome)];

    const data = assembleSwissPairs(game, club, pairs, boards);

    expect(data.kind).toBe("SWISS_PAIRS");
    expect(data.pairs.map((p) => p.pairNumber)).toEqual(["A1NS", "A1EW"]);
    expect(data.pairs[0].direction).toBe("N");
    expect(data.pairs[1].direction).toBe("E");
  });

  it("builds one match per table with the boards' traveller lines", () => {
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = [
      board(1, 1, 1, "A1NS", "A1EW", "3NTN+1" as BoardOutcome, "HK"),
      board(1, 1, 2, "A1NS", "A1EW", "4SE-1" as BoardOutcome),
    ];

    const data = assembleSwissPairs(game, club, pairs, boards);

    expect(data.matches).toHaveLength(1);
    const match = data.matches[0];
    expect(match.round).toBe(1);
    expect(match.nsPairNumber).toBe("A1NS");
    expect(match.ewPairNumber).toBe("A1EW");
    expect(match.boards.map((b) => b.boardNumber)).toEqual([1, 2]);
    expect(match.boards[0]).toMatchObject({
      contract: "3NT",
      playedBy: "N",
      lead: "HK",
      tricks: "10",
    });
  });

  it("scores a table's match cross-IMP vs the field (NS + EW sum to 20)", () => {
    const pairs = [
      pair("A1NS", "Al"),
      pair("A1EW", "Cy"),
      pair("A2NS", "Ed"),
      pair("A2EW", "Gu"),
      pair("A3NS", "Iv"),
      pair("A3EW", "Ka"),
    ];

    const data = assembleSwissPairs(game, club, pairs, threeTableRound());

    // Table 1's NS tops the field, EW is the mirror; a real-field match's two
    // integer VPs sum to 20 (equal and opposite cross-IMP).
    const t1 = data.matches.find((m) => m.nsPairNumber === "A1NS")!;
    expect(Number.isInteger(t1.nsScore)).toBe(true);
    expect(Number.isInteger(t1.ewScore)).toBe(true);
    expect(t1.nsScore + t1.ewScore).toBe(20);
    expect(t1.nsScore).toBeGreaterThan(t1.ewScore);
    // The field floor table: its NS loses, so NS < EW.
    const t3 = data.matches.find((m) => m.nsPairNumber === "A3NS")!;
    expect(t3.nsScore).toBeLessThan(t3.ewScore);
  });

  it("scores a single-table round (no field to compare) as a neutral 10/10", () => {
    // Cross-IMP needs at least two results on a board to compare; a lone table
    // has no field, so both pairs sit at the neutral 10.
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = [board(1, 1, 1, "A1NS", "A1EW", "4SN+1" as BoardOutcome)];

    const data = assembleSwissPairs(game, club, pairs, boards);
    const match = data.matches[0];

    expect(match.nsScore).toBe(10);
    expect(match.ewScore).toBe(10);
  });

  it("scores an unplayed table as a neutral 10/10", () => {
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = [board(1, 1, 1, "A1NS", "A1EW", null)];

    const data = assembleSwissPairs(game, club, pairs, boards);
    const match = data.matches[0];

    expect(match.nsScore).toBe(10);
    expect(match.ewScore).toBe(10);
  });

  it("ranks pairs by total VP across the field, highest first", () => {
    const pairs = [
      pair("A1NS", "Al"),
      pair("A1EW", "Cy"),
      pair("A2NS", "Ed"),
      pair("A2EW", "Gu"),
      pair("A3NS", "Iv"),
      pair("A3EW", "Ka"),
    ];

    const data = assembleSwissPairs(game, club, pairs, threeTableRound());

    expect(data.ranking[0].place).toBe(1);
    // The field-topping NS pair (table 1) tops the ranking.
    expect(data.ranking[0].number).toBe("A1NS");
    expect(data.ranking[0].totalVP).toBeGreaterThanOrEqual(
      data.ranking[data.ranking.length - 1].totalVP,
    );
  });

  it("skips SIT_OUT rows when building matches", () => {
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = [
      { ...board(1, 1, 1, "A1NS", "A1EW", null), status: "SIT_OUT" } as Board,
    ];

    const data = assembleSwissPairs(game, club, pairs, boards);
    expect(data.matches).toHaveLength(0);
  });

  it("defaults a blank event section name to 'A'", () => {
    const blankSection = { ...game, sectionName: "" } as BridgeGame;
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = [board(1, 1, 1, "A1NS", "A1EW", "3NTN=" as BoardOutcome)];

    const data = assembleSwissPairs(blankSection, club, pairs, boards);
    expect(data.sectionName).toBe("A");
  });

  it("falls back to section 'A' for a pair id that isn't a section-qualified seat", () => {
    const pairs = [pair("A1NS", "Al"), pair("A1EW", "Cy")];
    const boards = threeTableRound().map((b, i) =>
      i === 0 ? { ...b, ns: "ODD" } : b,
    );

    const data = assembleSwissPairs(game, club, pairs, boards);
    const oddEntry = data.ranking.find((r) => r.number === "ODD");
    expect(oddEntry?.sectionId).toBe("A");
  });

  describe("matchpoint mode", () => {
    it("scores each table's match on the matchpoint field", () => {
      const pairs = [
        pair("A1NS", "Al"),
        pair("A1EW", "Cy"),
        pair("A2NS", "Ed"),
        pair("A2EW", "Gu"),
        pair("A3NS", "Iv"),
        pair("A3EW", "Ka"),
      ];

      const data = assembleSwissPairs(
        game,
        club,
        pairs,
        threeTableRound(),
        "MP",
      );

      // The field-topping table's NS beats its EW (independent MP VP).
      const t1 = data.matches.find((m) => m.nsPairNumber === "A1NS")!;
      expect(t1.nsScore).toBeGreaterThan(t1.ewScore);
      // Integer VP on the discrete scale.
      expect(Number.isInteger(t1.nsScore)).toBe(true);
    });
  });

  describe("2 half matches (odd field)", () => {
    // An 8-board round. The anchor (A1NS) plays X (A2EW) on boards 1-4 and
    // Y (A3EW) on boards 5-8, at its table 1. Two ordinary tables (2, 3) play
    // all 8 boards as the field. X is compensated on boards 5-8, Y on 1-4.
    const TOP: BoardOutcome = "6NTN=";
    const MID: BoardOutcome = "3NTN=";
    const LOW: BoardOutcome = "3NTN-1";

    function halfMatchRound(): Board[] {
      const rows: Board[] = [];
      // Anchor table: half 1 (boards 1-4) vs X, half 2 (boards 5-8) vs Y.
      for (let b = 1; b <= 4; b++) {
        rows.push(board(1, 1, b, "A1NS", "A2EW", TOP));
      }
      for (let b = 5; b <= 8; b++) {
        rows.push(board(1, 1, b, "A1NS", "A3EW", TOP));
      }
      // Two ordinary field tables over all 8 boards.
      for (let b = 1; b <= 8; b++) {
        rows.push(board(1, 2, b, "A2NS", "A2EW2", MID));
        rows.push(board(1, 3, b, "A3NS", "A3EW3", LOW));
      }
      // Compensation: X (A2EW) missed boards 5-8; Y (A3EW) missed boards 1-4.
      for (let b = 5; b <= 8; b++) {
        rows.push({
          ...board(1, 4, b, "A2EW", "APHANTOM", null),
          status: "HALF_AVERAGE",
        } as Board);
      }
      for (let b = 1; b <= 4; b++) {
        rows.push({
          ...board(1, 5, b, "A3EW", "APHANTOM", null),
          status: "HALF_AVERAGE",
        } as Board);
      }
      return rows;
    }

    const pairs = [
      pair("A1NS", "An"),
      pair("A2EW", "Ex"),
      pair("A3EW", "Wy"),
      pair("A2NS", "Fa"),
      pair("A2EW2", "Fb"),
      pair("A3NS", "Fc"),
      pair("A3EW3", "Fd"),
    ];

    it("emits the anchor's two real halves as two matches, one per opponent", () => {
      const data = assembleSwissPairs(game, club, pairs, halfMatchRound());

      const anchorMatches = data.matches.filter(
        (m) => m.nsPairNumber === "A1NS" || m.ewPairNumber === "A1NS",
      );
      expect(anchorMatches).toHaveLength(2);
      const opponents = anchorMatches
        .map((m) => (m.nsPairNumber === "A1NS" ? m.ewPairNumber : m.nsPairNumber))
        .sort();
      expect(opponents).toEqual(["A2EW", "A3EW"]);
      // Each half covers four boards.
      for (const m of anchorMatches) {
        expect(m.boards).toHaveLength(4);
      }
    });

    it("never emits a MATCH for a compensated (phantom) half", () => {
      const data = assembleSwissPairs(game, club, pairs, halfMatchRound());
      const phantomMatch = data.matches.some(
        (m) => m.nsPairNumber === "APHANTOM" || m.ewPairNumber === "APHANTOM",
      );
      expect(phantomMatch).toBe(false);
    });

    it("credits each non-anchor a TOTAL_SCORE including its compensated half", () => {
      const data = assembleSwissPairs(game, club, pairs, halfMatchRound());

      // X (A2EW) plays one real half (as the anchor's EW opponent) and is
      // compensated for the other. Its ranking total is the sum of both halves
      // — strictly more than the single real-half MATCH score it appears in.
      const xTotal = data.ranking.find((r) => r.number === "A2EW")!.totalVP;
      const xMatch = data.matches.find(
        (m) => m.nsPairNumber === "A2EW" || m.ewPairNumber === "A2EW",
      )!;
      const xMatchVp =
        xMatch.nsPairNumber === "A2EW" ? xMatch.nsScore : xMatch.ewScore;
      // Compensation (AVE+/AVE) is strictly above 0, so the total exceeds the
      // one real-half match score alone.
      expect(xTotal).toBeGreaterThan(xMatchVp);
      // The phantom is never ranked.
      expect(data.ranking.some((r) => r.number === "APHANTOM")).toBe(false);
    });

    it("sums the anchor's two real halves into its /20 round total", () => {
      const data = assembleSwissPairs(game, club, pairs, halfMatchRound());
      const anchorTotal = data.ranking.find((r) => r.number === "A1NS")!.totalVP;
      // The anchor blitzes the field on every board (6NT= vs 3NT=/3NT-1), so
      // both halves max out: 10 + 10 = 20.
      expect(anchorTotal).toBe(20);
    });
  });
});
