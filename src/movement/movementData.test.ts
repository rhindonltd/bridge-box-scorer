import { describe, it, expect } from "vitest";

import { buildRounds, type MovementByTable } from "./movementData";

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
