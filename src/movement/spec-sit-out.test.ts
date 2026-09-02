import { describe, it, expect } from "vitest";
import { RehydratedTable } from "@/services/movement-rehydration";
import {
  applySpecSitOutNoMissingPair,
  alignSpecMissingPair,
  flagPhantomRounds,
} from "./spec-sit-out";

/**
 * A synthetic 3-table two-winner movement (NS pairs 1..3 fixed, EW pairs 4..6
 * rotating one table per round), 2 boards per round.
 *
 * R1: T1(1,4) T2(2,5) T3(3,6)
 * R2: T1(1,6) T2(2,4) T3(3,5)
 * R3: T1(1,5) T2(2,6) T3(3,4)
 */
function makeMovement(): RehydratedTable[] {
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
    tableNumber,
    rounds: pairings[tableNumber].map(([ns, ew], idx) => ({
      roundNumber: idx + 1,
      ns,
      ew,
      boardStart: idx * 2 + 1,
      boardEnd: idx * 2 + 2,
    })),
  }));
}

describe("flagPhantomRounds", () => {
  it("flags rounds where the phantom sits and leaves others unflagged", () => {
    const result = flagPhantomRounds(makeMovement(), "6");

    // Phantom "6" is at: R1 T3, R2 T1, R3 T2.
    const flagged: string[] = [];
    for (const table of result) {
      for (const round of table.rounds) {
        if (round.sitOut) {
          flagged.push(`R${round.roundNumber}T${table.tableNumber}`);
        }
      }
    }
    expect(flagged.sort()).toEqual(["R1T3", "R2T1", "R3T2"]);
  });

  it("preserves real board ranges on flagged rounds", () => {
    const result = flagPhantomRounds(makeMovement(), "6");
    const t3r1 = result.find((t) => t.tableNumber === 3)!.rounds[0];
    expect(t3r1.sitOut).toBe(true);
    expect(t3r1.boardStart).toBe(1);
    expect(t3r1.boardEnd).toBe(2);
  });
});

describe("applySpecSitOutNoMissingPair", () => {
  it("treats the position at the sit-out seat as the phantom (one per round)", () => {
    const result = applySpecSitOutNoMissingPair(makeMovement(), "A3EW");

    for (let r = 0; r < 3; r++) {
      const sitOuts = result.filter((t) => t.rounds[r].sitOut).length;
      expect(sitOuts).toBe(1);
    }
  });
});

describe("alignSpecMissingPair", () => {
  it("rotates the EW direction so the file phantom lands on the requested seat", () => {
    // File phantom "6" sits at 3EW in round 1. Request the empty seat as 1EW.
    const result = alignSpecMissingPair(makeMovement(), "6", "A1EW");

    const t1r1 = result.find((t) => t.tableNumber === 1)!.rounds[0];
    expect(t1r1.ew).toBe("6");
    expect(t1r1.sitOut).toBe(true);
  });

  it("keeps exactly one sit-out per round after alignment", () => {
    const result = alignSpecMissingPair(makeMovement(), "6", "A1EW");

    for (let r = 0; r < 3; r++) {
      const sitOuts = result.filter((t) => t.rounds[r].sitOut).length;
      expect(sitOuts).toBe(1);
    }
  });

  it("flags in place when the phantom already sits at the requested seat", () => {
    const result = alignSpecMissingPair(makeMovement(), "6", "A3EW");
    const t3r1 = result.find((t) => t.tableNumber === 3)!.rounds[0];
    expect(t3r1.ew).toBe("6");
    expect(t3r1.sitOut).toBe(true);
  });
});
