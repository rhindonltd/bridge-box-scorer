import { describe, it, expect } from "vitest";
import { PairMovement } from "@/db/movements/queries/get-movement";
import {
  applySpecSitOutNoMissingPair,
  alignSpecMissingPair,
  blankPhantomBoards,
} from "./spec-sit-out";

/**
 * A synthetic 3-table two-winner movement (NS pairs 1..3 fixed, EW pairs 4..6
 * rotating one table per round), 2 boards per round.
 *
 * R1: T1(1,4) T2(2,5) T3(3,6)
 * R2: T1(1,6) T2(2,4) T3(3,5)
 * R3: T1(1,5) T2(2,6) T3(3,4)
 */
function makeMovement(): PairMovement[] {
  const pairings: Record<number, [string, string][]> = {
    1: [
      ["1", "4"],
      ["1", "6"],
      ["1", "5"],
    ],
    2: [
      ["2", "5"],
      ["2", "4"],
      ["2", "6"],
    ],
    3: [
      ["3", "6"],
      ["3", "5"],
      ["3", "4"],
    ],
  };

  return [1, 2, 3].map((tableNumber) => ({
    id: tableNumber,
    movementId: 0,
    tableNumber,
    rounds: pairings[tableNumber].map(([ns, ew], idx) => ({
      id: idx,
      tableId: tableNumber,
      roundNumber: idx + 1,
      ns,
      ew,
      boardStart: idx * 2 + 1,
      boardEnd: idx * 2 + 2,
    })),
  }));
}

function playsBoards(round: { boardStart: number; boardEnd: number }): boolean {
  return round.boardEnd >= round.boardStart;
}

describe("blankPhantomBoards", () => {
  it("blanks boards wherever the phantom id appears and leaves others intact", () => {
    const result = blankPhantomBoards(makeMovement(), "6");

    // Phantom "6" is at: R1 T3, R2 T1, R3 T2.
    const emptied: string[] = [];
    for (const table of result) {
      for (const round of table.rounds) {
        if (!playsBoards(round)) {
          emptied.push(`R${round.roundNumber}T${table.tableNumber}`);
        }
      }
    }
    expect(emptied.sort()).toEqual(["R1T3", "R2T1", "R3T2"]);
  });
});

describe("applySpecSitOutNoMissingPair", () => {
  it("treats the position at the sit-out seat as the phantom (one sit-out per round)", () => {
    const result = applySpecSitOutNoMissingPair(makeMovement(), "3EW");

    // Seat 3EW in round 1 is pair "6"; each round has exactly one table not
    // playing boards.
    for (let r = 1; r <= 3; r++) {
      const sitOuts = result.filter(
        (t) => !playsBoards(t.rounds[r - 1]),
      ).length;
      expect(sitOuts).toBe(1);
    }
  });
});

describe("alignSpecMissingPair", () => {
  it("rotates the EW direction so the file phantom lands on the requested seat", () => {
    // File phantom is pair "6", which sits at 3EW in round 1. Request the empty
    // seat to be 1EW (offset -2 over 3 tables).
    const result = alignSpecMissingPair(makeMovement(), "6", "1EW");

    // After alignment, table 1's EW in round 1 should be the phantom "6", and
    // its boards blanked.
    const t1r1 = result.find((t) => t.tableNumber === 1)!.rounds[0];
    expect(t1r1.ew).toBe("6");
    expect(playsBoards(t1r1)).toBe(false);
  });

  it("keeps exactly one sit-out per round after alignment", () => {
    const result = alignSpecMissingPair(makeMovement(), "6", "1EW");

    for (let r = 1; r <= 3; r++) {
      const sitOuts = result.filter(
        (t) => !playsBoards(t.rounds[r - 1]),
      ).length;
      expect(sitOuts).toBe(1);
    }
  });

  it("is a no-op alignment (only blanks) when the phantom already sits at the requested seat", () => {
    const result = alignSpecMissingPair(makeMovement(), "6", "3EW");
    const t3r1 = result.find((t) => t.tableNumber === 3)!.rounds[0];
    expect(t3r1.ew).toBe("6");
    expect(playsBoards(t3r1)).toBe(false);
  });
});
