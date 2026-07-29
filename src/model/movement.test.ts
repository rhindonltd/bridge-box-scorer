import { describe, it, expect } from "vitest";
import type {
  Movement,
  IndividualMovement,
  PairMovement,
  AnyMovement,
  Round,
  Table,
} from "./movement";

/**
 * model/movement.ts exports only types — no runtime functions.
 * These tests validate the type definitions are importable and structurally
 * correct via runtime object assertions.
 */
describe("model/movement types", () => {
  it("IndividualMovement has expected structure", () => {
    const movement: IndividualMovement = {
      type: "INDIVIDUAL",
      rounds: [
        {
          round: 1,
          tables: [
            {
              table: 1,
              boards: [1, 2],
              participants: { nId: "N1", sId: "S1", eId: "E1", wId: "W1" },
            },
          ],
        },
      ],
    };

    expect(movement.type).toBe("INDIVIDUAL");
    expect(movement.rounds).toHaveLength(1);
    expect(movement.rounds[0].tables[0].participants.nId).toBe("N1");
  });

  it("PairMovement has expected structure", () => {
    const movement: PairMovement = {
      type: "PAIR",
      rounds: [
        {
          round: 1,
          tables: [
            {
              table: 1,
              boards: [1, 2, 3],
              participants: { nsId: "ns1", ewId: "ew1" },
            },
          ],
        },
      ],
    };

    expect(movement.type).toBe("PAIR");
    expect(movement.rounds[0].tables[0].participants.nsId).toBe("ns1");
  });

  it("AnyMovement can be narrowed by type field", () => {
    const movement: AnyMovement = {
      type: "PAIR",
      rounds: [
        {
          round: 1,
          tables: [
            {
              table: 1,
              boards: [1],
              participants: { nsId: "ns1", ewId: "ew1" },
            },
          ],
        },
      ],
    };

    if (movement.type === "PAIR") {
      expect(movement.rounds[0].tables[0].participants.nsId).toBe("ns1");
    }
  });

  it("Round type holds table assignments per round", () => {
    const round: Round<"INDIVIDUAL"> = {
      round: 2,
      tables: [
        {
          table: 1,
          boards: [3, 4],
          participants: { nId: "N1", sId: "S1", eId: "E1", wId: "W1" },
        },
        {
          table: 2,
          boards: [5, 6],
          participants: { nId: "N2", sId: "S2", eId: "E2", wId: "W2" },
        },
      ],
    };

    expect(round.round).toBe(2);
    expect(round.tables).toHaveLength(2);
  });

  it("Table type holds rounds for a specific table", () => {
    const table: Table<"PAIR"> = {
      table: 1,
      rounds: [
        {
          round: 1,
          boards: [1, 2],
          participants: { nsId: "ns1", ewId: "ew1" },
        },
        {
          round: 2,
          boards: [3, 4],
          participants: { nsId: "ns2", ewId: "ew2" },
        },
      ],
    };

    expect(table.table).toBe(1);
    expect(table.rounds).toHaveLength(2);
  });
});
