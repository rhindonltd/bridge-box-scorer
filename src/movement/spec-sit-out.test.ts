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
      boardCopy: "A",
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

  it("aligns an NS-direction phantom by rotating the NS direction", () => {
    // Build a movement whose phantom "1" is an NS pair sitting at 1NS in R1.
    // Request the sit-out at 2NS: aligns via NS rotation.
    const result = alignSpecMissingPair(makeMovement(), "1", "A2NS");

    const t2r1 = result.find((t) => t.tableNumber === 2)!.rounds[0];
    expect(t2r1.ns).toBe("1");
    expect(t2r1.sitOut).toBe(true);
    for (let r = 0; r < 3; r++) {
      const sitOuts = result.filter((t) => t.rounds[r].sitOut).length;
      expect(sitOuts).toBe(1);
    }
  });

  it("flags in place when the phantom is not present in round 1", () => {
    // "99" is not a position in the movement, so findPhantomSeat returns null.
    const result = alignSpecMissingPair(makeMovement(), "99", "A1EW");

    // Nothing is flagged because the phantom id matches no round.
    const anyFlagged = result.some((t) => t.rounds.some((r) => r.sitOut));
    expect(anyFlagged).toBe(false);
  });

  it("falls back to flagging in place when the requested direction differs from the phantom's", () => {
    // Phantom "6" sits EW, but the requested seat is NS. Cannot rotate across
    // directions, so it is flagged where it already sits (3EW in R1).
    const result = alignSpecMissingPair(makeMovement(), "6", "A1NS");

    const t3r1 = result.find((t) => t.tableNumber === 3)!.rounds[0];
    expect(t3r1.ew).toBe("6");
    expect(t3r1.sitOut).toBe(true);
    // Still exactly one sit-out per round (unrotated positions of "6").
    for (let r = 0; r < 3; r++) {
      const sitOuts = result.filter((t) => t.rounds[r].sitOut).length;
      expect(sitOuts).toBe(1);
    }
  });
});

describe("alignSpecMissingPair — malformed / edge-case movements", () => {
  it("skips tables that have no round 1 when locating the phantom", () => {
    // First table has no round 1 (only round 2), forcing findPhantomSeat to
    // `continue`. The phantom "5" is found on the second table's round 1 (EW).
    const movement: RehydratedTable[] = [
      {
        tableNumber: 1,
        rounds: [
          {
            roundNumber: 2,
            ns: "1",
            ew: "9",
            boardStart: 3,
            boardEnd: 4,
            boardCopy: "A",
          },
        ],
      },
      {
        tableNumber: 2,
        rounds: [
          {
            roundNumber: 1,
            ns: "2",
            ew: "5",
            boardStart: 1,
            boardEnd: 2,
            boardCopy: "A",
          },
        ],
      },
    ];

    // Align phantom "5" (at 2EW) to its own seat 2EW: offset 0, flag in place.
    const result = alignSpecMissingPair(movement, "5", "A2EW");
    const t2r1 = result.find((t) => t.tableNumber === 2)!.rounds[0];
    expect(t2r1.ew).toBe("5");
    expect(t2r1.sitOut).toBe(true);
  });

  it("falls back to the current table when a rotation source table is missing", () => {
    // Table numbers are non-contiguous (1, 2, 4) but tableCount() is 4, so a
    // rotation can reference table 3, which is absent from the map. That
    // exercises the `?? table` source fallback and the `?? round` fallback
    // when a source table has fewer rounds than the current table.
    const movement: RehydratedTable[] = [
      {
        tableNumber: 1,
        rounds: [
          {
            roundNumber: 1,
            ns: "1",
            ew: "7",
            boardStart: 1,
            boardEnd: 2,
            boardCopy: "A",
          },
          {
            roundNumber: 2,
            ns: "1",
            ew: "8",
            boardStart: 3,
            boardEnd: 4,
            boardCopy: "A",
          },
        ],
      },
      {
        tableNumber: 2,
        rounds: [
          {
            roundNumber: 1,
            ns: "2",
            ew: "8",
            boardStart: 1,
            boardEnd: 2,
            boardCopy: "A",
          },
          {
            roundNumber: 2,
            ns: "2",
            ew: "7",
            boardStart: 3,
            boardEnd: 4,
            boardCopy: "A",
          },
        ],
      },
      {
        tableNumber: 4,
        rounds: [
          {
            roundNumber: 1,
            ns: "4",
            ew: "9",
            boardStart: 1,
            boardEnd: 2,
            boardCopy: "A",
          },
          // Only one round — shorter than table 1/2, exercising `?? round`.
        ],
      },
    ];

    // Phantom "9" is EW at table 4 in round 1. Request 1EW so offset = 1 - 4
    // = -3 (non-zero mod 4), triggering rotation across the sparse tables.
    const result = alignSpecMissingPair(movement, "9", "A1EW");

    // The result is well-formed and the phantom is still flagged somewhere.
    expect(result).toHaveLength(3);
    const anyFlagged = result.some((t) => t.rounds.some((r) => r.sitOut));
    expect(anyFlagged).toBe(true);
  });
});

describe("applySpecSitOutNoMissingPair — no position at seat", () => {
  it("flags nothing when the requested seat has no round-1 position", () => {
    // Table 9 does not exist, so positionAtSeat returns null and an empty
    // phantom id ("") is flagged — matching no round.
    const result = applySpecSitOutNoMissingPair(makeMovement(), "A9EW");

    const anyFlagged = result.some((t) => t.rounds.some((r) => r.sitOut));
    expect(anyFlagged).toBe(false);
  });

  it("reads the NS position when the sit-out seat is an NS seat", () => {
    // Exercises the NS branch of positionAtSeat: 1NS holds position "1".
    const result = applySpecSitOutNoMissingPair(makeMovement(), "A1NS");

    const t1r1 = result.find((t) => t.tableNumber === 1)!.rounds[0];
    expect(t1r1.ns).toBe("1");
    expect(t1r1.sitOut).toBe(true);
  });
});
