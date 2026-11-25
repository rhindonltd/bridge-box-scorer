import { describe, it, expect } from "vitest";
import { teamBoardResult, type TeamBoardResultLine } from "./team-board-result";

/** Board 1: table 1 (team A1 at home) against table 2 (team A2 at home). */
const lines: TeamBoardResultLine[] = [
  { tableNumber: 1, ns: "A1NS", ew: "A2EW", result: "3NTN+1" as never },
  { tableNumber: 2, ns: "A2NS", ew: "A1EW", result: "3NTN=" as never },
];

describe("teamBoardResult", () => {
  it("gives both rooms' results and scores and the team's net IMPs", () => {
    // 3NT+1 = +430 at home, 3NT= = +400 away: computeImps(30) = 1 IMP.
    expect(teamBoardResult(lines, 1, "A1NS")).toEqual({
      home: { ns: "A1NS", ew: "A2EW", result: "3NTN+1", score: 430 },
      away: { ns: "A2NS", ew: "A1EW", result: "3NTN=", score: 400 },
      netImps: 1,
    });
  });

  it("has no away room and no net IMPs when the other table has no line", () => {
    expect(teamBoardResult([lines[0]], 1, "A1NS")).toEqual({
      home: { ns: "A1NS", ew: "A2EW", result: "3NTN+1", score: 430 },
      away: null,
      netImps: null,
    });
  });

  it("is null when the viewing table has no line for the board", () => {
    expect(teamBoardResult(lines, 1, "A3NS")).toBeNull();
  });
});
