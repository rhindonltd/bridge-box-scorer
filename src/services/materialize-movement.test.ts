import { describe, it, expect } from "vitest";

import {
  buildSectionRows,
  sectionParticipantId,
  mitchellToPairMovement,
  type MaterializableMovement,
} from "./materialize-movement";
import type { Tables } from "@/model/movement";

describe("sectionParticipantId", () => {
  it("prefixes the movement id with the section letter", () => {
    expect(sectionParticipantId("A", "1NS")).toBe("A1NS");
    expect(sectionParticipantId("B", "13")).toBe("B13");
  });
});

describe("buildSectionRows", () => {
  it("expands each round into one board row per board number", () => {
    const movement: MaterializableMovement = [
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1NS", ew: "1EW", boardStart: 1, boardEnd: 2 },
        ],
      },
    ];

    const { boardRows } = buildSectionRows("A", movement);

    expect(boardRows).toHaveLength(2);
    expect(boardRows[0]).toMatchObject({
      section: "A",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 1,
      copy: "A",
      ns: "A1NS",
      ew: "A1EW",
      status: "NOT_PLAYED",
    });
    expect(boardRows[1].boardNumber).toBe(2);
  });

  it("only emits assignment rows for round 1, section-qualified and seated", () => {
    const movement: MaterializableMovement = [
      {
        tableNumber: 2,
        rounds: [
          { roundNumber: 1, ns: "5", ew: "9", boardStart: 1, boardEnd: 1 },
          { roundNumber: 2, ns: "6", ew: "10", boardStart: 2, boardEnd: 2 },
        ],
      },
    ];

    const { assignmentRows } = buildSectionRows("B", movement);

    expect(assignmentRows).toEqual([
      { id: "B5", initialSeat: "B2NS" },
      { id: "B9", initialSeat: "B2EW" },
    ]);
  });

  it("marks sit-out rounds with SIT_OUT status but still produces board rows", () => {
    const movement: MaterializableMovement = [
      {
        tableNumber: 3,
        rounds: [
          {
            roundNumber: 2,
            ns: "1",
            ew: "2",
            boardStart: 3,
            boardEnd: 4,
            sitOut: true,
          },
        ],
      },
    ];

    const { boardRows } = buildSectionRows("A", movement);

    expect(boardRows).toHaveLength(2);
    expect(boardRows.every((r) => r.status === "SIT_OUT")).toBe(true);
  });

  it("honours an explicit board copy (Web Mitchell) and defaults to A otherwise", () => {
    const movement: MaterializableMovement = [
      {
        tableNumber: 1,
        rounds: [
          {
            roundNumber: 1,
            ns: "1",
            ew: "2",
            boardStart: 1,
            boardEnd: 1,
            boardCopy: "B",
          },
          { roundNumber: 2, ns: "1", ew: "3", boardStart: 2, boardEnd: 2 },
        ],
      },
    ];

    const { boardRows } = buildSectionRows("A", movement);

    expect(boardRows[0].copy).toBe("B");
    expect(boardRows[1].copy).toBe("A");
  });

  it("returns empty rows for an empty movement", () => {
    const { boardRows, assignmentRows } = buildSectionRows("A", []);
    expect(boardRows).toEqual([]);
    expect(assignmentRows).toEqual([]);
  });
});

describe("mitchellToPairMovement", () => {
  it("maps table/round shape and derives boardStart/boardEnd from the boards array", () => {
    const tables: Tables<"PAIR"> = {
      tables: [
        {
          table: 1,
          rounds: [
            {
              round: 1,
              boards: [1, 2, 3],
              boardCopy: "A",
              participants: { nsId: "1NS", ewId: "1EW" },
            },
            {
              round: 2,
              boards: [4, 5, 6],
              participants: { nsId: "1NS", ewId: "2EW" },
            },
          ],
        },
      ],
    };

    expect(mitchellToPairMovement(tables)).toEqual([
      {
        tableNumber: 1,
        rounds: [
          {
            roundNumber: 1,
            ns: "1NS",
            ew: "1EW",
            boardStart: 1,
            boardEnd: 3,
            boardCopy: "A",
          },
          {
            roundNumber: 2,
            ns: "1NS",
            ew: "2EW",
            boardStart: 4,
            boardEnd: 6,
            boardCopy: undefined,
          },
        ],
      },
    ]);
  });
});
