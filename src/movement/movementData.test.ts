import { describe, it, expect } from "vitest";

import {
  buildRounds,
  generatedToMovementByTable,
  type MovementByTable,
} from "./movementData";
import { generateMitchell } from "./mitchell/mitchell";

describe("buildRounds", () => {
  it("returns an empty array for no tables", () => {
    expect(buildRounds([])).toEqual([]);
  });

  it("transposes a by-table movement into a by-round movement", () => {
    const tables: MovementByTable[] = [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1", ew: "4", boardStart: 1, boardEnd: 2 },
          { roundNumber: 2, ns: "1", ew: "5", boardStart: 3, boardEnd: 4 },
        ],
      },
      {
        tableNumber: 2,
        rounds: [
          { roundNumber: 1, ns: "2", ew: "5", boardStart: 3, boardEnd: 4 },
          { roundNumber: 2, ns: "2", ew: "6", boardStart: 5, boardEnd: 6 },
        ],
      },
    ];

    const rounds = buildRounds(tables);

    expect(rounds).toHaveLength(2);
    expect(rounds[0]).toEqual({
      roundNumber: 1,
      tables: [
        { tableNumber: 1, roundNumber: 1, ns: "1", ew: "4", boardStart: 1, boardEnd: 2 },
        { tableNumber: 2, roundNumber: 1, ns: "2", ew: "5", boardStart: 3, boardEnd: 4 },
      ],
    });
    expect(rounds[1].roundNumber).toBe(2);
    expect(rounds[1].tables.map((t) => t.tableNumber)).toEqual([1, 2]);
  });

  it("derives the round count from the first table", () => {
    const tables: MovementByTable[] = [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, boardStart: 1, boardEnd: 2 },
          { roundNumber: 2, boardStart: 3, boardEnd: 4 },
          { roundNumber: 3, boardStart: 5, boardEnd: 6 },
        ],
      },
    ];

    expect(buildRounds(tables)).toHaveLength(3);
  });

  it("carries per-cell metadata (played/total/hasPreviousGap) through", () => {
    const tables: MovementByTable[] = [
      {
        tableNumber: 1,
        rounds: [
          {
            roundNumber: 1,
            ns: "1",
            ew: "4",
            boardStart: 1,
            boardEnd: 2,
            played: 1,
            total: 2,
            hasPreviousGap: true,
          },
        ],
      },
    ];

    expect(buildRounds(tables)[0].tables[0]).toMatchObject({
      played: 1,
      total: 2,
      hasPreviousGap: true,
    });
  });
});

describe("generatedToMovementByTable", () => {
  it("maps a standard Mitchell with no board copies", () => {
    const tables = generatedToMovementByTable(
      generateMitchell({ tables: 5, rounds: 5, boardsPerRound: 2 }),
    );

    expect(tables).toHaveLength(5);
    // Round 1 board ranges come straight from the generator's board lists.
    expect(tables[0].rounds[0]).toMatchObject({
      roundNumber: 1,
      boardStart: 1,
      boardEnd: 2,
    });
    // Standard Mitchell is single-copy: no boardCopy is set on any round.
    for (const table of tables) {
      for (const round of table.rounds) {
        expect(round.boardCopy).toBeUndefined();
      }
    }
  });

  it("carries board copy labels through for a Web Mitchell", () => {
    const tables = generatedToMovementByTable(
      generateMitchell({
        tables: 8,
        rounds: 4,
        boardsPerRound: 3,
        web: true,
      }),
    );

    const copies = new Set<string | undefined>();
    for (const table of tables) {
      for (const round of table.rounds) {
        copies.add(round.boardCopy);
      }
    }

    // An even-table Web plays on two physical copies (A and B).
    expect(copies).toContain("A");
    expect(copies).toContain("B");
    expect(copies.has(undefined)).toBe(false);
  });
});
