import { describe, it, expect } from "vitest";
import {
  parseInts,
  chunk,
  boardSetToBoardList,
  formatBoards,
  groupByRound,
  parseHeader,
  buildMovementBase,
  parseMovementType,
  MovementType,
  groupLinesReducer,
  splitLinesOfFile,
} from "./shared";
import { Tables } from "@/model/movement";

describe("parseInts", () => {
  it("parses comma-separated integers", () => {
    expect(parseInts("1,2,3")).toEqual([1, 2, 3]);
  });

  it("handles whitespace around numbers", () => {
    expect(parseInts(" 1 , 2 , 3 ")).toEqual([1, 2, 3]);
  });

  it("handles a single number", () => {
    expect(parseInts("42")).toEqual([42]);
  });
});

describe("chunk", () => {
  it("splits array into chunks of given size", () => {
    expect(chunk([1, 2, 3, 4, 5, 6], 2)).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it("handles array not evenly divisible by chunk size", () => {
    expect(chunk([1, 2, 3, 4, 5], 3)).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it("returns single chunk when size >= array length", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });
});

describe("boardSetToBoardList", () => {
  it("generates board numbers from boardSet 1 with 2 boards per round", () => {
    expect(boardSetToBoardList(1, 2)).toEqual([1, 2]);
  });

  it("generates board numbers from boardSet 2 with 3 boards per round", () => {
    expect(boardSetToBoardList(2, 3)).toEqual([4, 5, 6]);
  });

  it("generates board numbers from boardSet 3 with 4 boards per round", () => {
    expect(boardSetToBoardList(3, 4)).toEqual([9, 10, 11, 12]);
  });

  it("handles boardSet 1 with 1 board per round", () => {
    expect(boardSetToBoardList(1, 1)).toEqual([1]);
  });
});

describe("formatBoards", () => {
  it("returns empty string for empty array", () => {
    expect(formatBoards([])).toBe("");
  });

  it("formats single board", () => {
    expect(formatBoards([5])).toBe("5");
  });

  it("formats consecutive boards as a range", () => {
    expect(formatBoards([1, 2, 3])).toBe("1-3");
  });

  it("formats non-consecutive boards as separate values", () => {
    expect(formatBoards([1, 3, 5])).toBe("1,3,5");
  });

  it("formats mix of ranges and single boards", () => {
    expect(formatBoards([1, 2, 3, 7, 8, 12])).toBe("1-3,7-8,12");
  });
});

describe("parseMovementType", () => {
  it("maps numeric values to MovementType", () => {
    expect(parseMovementType(0)).toBe(MovementType.MITCHELL);
    expect(parseMovementType(1)).toBe(MovementType.SWITCHED_MITCHELL);
    expect(parseMovementType(2)).toBe(MovementType.HOWELL);
    expect(parseMovementType(3)).toBe(MovementType.AMERICAN_WHIST);
    expect(parseMovementType(4)).toBe(MovementType.SCORE_BREAK);
  });
});

describe("parseHeader", () => {
  it("parses a standard header from two lines", () => {
    // Format: movementType, tables, totalBoards, boardsPerSet, rounds[, missingParticipant]
    const lines = ["Mitchell 3 Table", "0,3,9,3,3"];
    const header = parseHeader(lines);
    expect(header).toEqual({
      name: "Mitchell 3 Table",
      movementType: MovementType.MITCHELL,
      numberOfTables: 3,
      numberOfBoardSets: 3, // 9/3
      defaultBoardsPerSet: 3,
      numberOfRounds: 3,
      missingParticipant: 0,
    });
  });

  it("parses header with missing participant field", () => {
    const lines = ["Howell 4 Table", "2,4,12,3,4,5"];
    const header = parseHeader(lines);
    expect(header.missingParticipant).toBe(5);
  });

  it("defaults missingParticipant to 0 when not provided", () => {
    const lines = ["Simple", "0,2,6,3,2"];
    const header = parseHeader(lines);
    expect(header.missingParticipant).toBe(0);
  });
});

describe("buildMovementBase", () => {
  it("builds a movement object from header and tables", () => {
    const header = {
      name: "Test Movement",
      movementType: MovementType.MITCHELL,
      numberOfTables: 3,
      numberOfBoardSets: 3,
      defaultBoardsPerSet: 2,
      numberOfRounds: 3,
      missingParticipant: 0,
    };
    const tables = [
      {
        table: 1,
        rounds: [
          { round: 1, boards: [1, 2], participants: { nsId: "1", ewId: "2" } },
        ],
      },
    ];
    const result = buildMovementBase(header, tables);
    expect(result).toEqual({
      name: "Test Movement",
      description: "Test Movement",
      tables: 3,
      boards: 6, // 3 * 2
      boardsPerRound: 2,
      rounds: 3,
      tableData: tables,
      missingParticipant: 0,
      type: MovementType.MITCHELL,
    });
  });
});

describe("groupLinesReducer", () => {
  it("starts a new group when line is empty", () => {
    const result = groupLinesReducer([["line1"]], "");
    expect(result).toEqual([["line1"], []]);
  });

  it("appends to the last group for non-empty lines", () => {
    const result = groupLinesReducer([["line1"]], "line2");
    expect(result).toEqual([["line1", "line2"]]);
  });

  it("creates a new group with the line when groups array is empty", () => {
    // This covers the defensive guard: if (!last) return [[line]]
    const result = groupLinesReducer([] as string[][], "hello");
    expect(result).toEqual([["hello"]]);
  });

  it("handles whitespace-only lines as empty", () => {
    const result = groupLinesReducer([["line1"]], "   ");
    expect(result).toEqual([["line1"], []]);
  });
});

describe("splitLinesOfFile", () => {
  it("reads and groups lines from a movement file", () => {
    const groups = splitLinesOfFile("PSMovements.txt");
    // File should contain at least one group of movement data
    expect(groups.length).toBeGreaterThan(0);
    // Each group should have at least one line
    for (const group of groups) {
      expect(group.length).toBeGreaterThan(0);
    }
  });
});

describe("groupByRound", () => {
  it("returns empty rounds for empty tables", () => {
    const movement: Tables<"PAIR"> = { tables: [] };
    const result = groupByRound(movement);
    expect(result.rounds).toEqual([]);
  });

  it("groups table data by round number", () => {
    const movement: Tables<"PAIR"> = {
      tables: [
        {
          table: 1,
          rounds: [
            {
              round: 1,
              boards: [1, 2],
              participants: { nsId: "1", ewId: "2" },
            },
            {
              round: 2,
              boards: [3, 4],
              participants: { nsId: "3", ewId: "4" },
            },
          ],
        },
        {
          table: 2,
          rounds: [
            {
              round: 1,
              boards: [3, 4],
              participants: { nsId: "3", ewId: "4" },
            },
            {
              round: 2,
              boards: [1, 2],
              participants: { nsId: "1", ewId: "2" },
            },
          ],
        },
      ],
    };

    const result = groupByRound(movement);

    expect(result.rounds).toHaveLength(2);
    expect(result.rounds[0].round).toBe(1);
    expect(result.rounds[0].tables).toHaveLength(2);
    expect(result.rounds[0].tables[0]).toEqual({
      table: 1,
      boards: [1, 2],
      participants: { nsId: "1", ewId: "2" },
    });
    expect(result.rounds[0].tables[1]).toEqual({
      table: 2,
      boards: [3, 4],
      participants: { nsId: "3", ewId: "4" },
    });
    expect(result.rounds[1].round).toBe(2);
  });
});
