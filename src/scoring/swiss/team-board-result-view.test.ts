import { describe, it, expect } from "vitest";

import {
  buildTeamBoardResultTable,
  TeamBoardResultLine,
} from "./team-board-result-view";
import { formatNumberCell, ScoreCell } from "@/scoring/table/score-table";

/**
 * A team match on board 1: table 1 (home team A1) vs table 2 (team A2).
 *  - Table 1: NS = A1NS (home team), EW = A2EW (team A2's away pair).
 *  - Table 2: NS = A2NS (team A2), EW = A1EW (team A1's away pair).
 */
function match(
  t1Result: string | null,
  t2Result: string | null,
): TeamBoardResultLine[] {
  return [
    { tableNumber: 1, ns: "A1NS", ew: "A2EW", result: t1Result as never },
    { tableNumber: 2, ns: "A2NS", ew: "A1EW", result: t2Result as never },
  ];
}

function text(cell: ScoreCell): string {
  if (cell.kind === "text") return cell.value;
  if (cell.kind === "number") return formatNumberCell(cell);
  if (cell.kind === "contract") return cell.outcome;
  return "";
}

describe("buildTeamBoardResultTable", () => {
  it("returns null when the viewing table has no line for the board", () => {
    // Viewing seat is at table 3, which is not in this board's match.
    expect(buildTeamBoardResultTable(match("3NTN+1", "3NTN="), 1, "A3NS")).toBe(
      null,
    );
  });

  it("shows both rooms' scores and a Team result row with the board swing", () => {
    // Table 1: 3NT+1 = +430; Table 2: 3NT= = +400. Team A1's board swing is
    // computeImps(430 − 400) = computeImps(30) = 1 IMP (netted then converted
    // once — the standard teams comparison).
    const table = buildTeamBoardResultTable(match("3NTN+1", "3NTN="), 1, "A1NS");
    expect(table).not.toBeNull();

    const [yourRow, otherRow, teamRow] = table!.rows;

    expect(text(yourRow.cells[0])).toBe("Home");
    expect(text(yourRow.cells[2])).toBe("430"); // my score

    expect(text(otherRow.cells[0])).toBe("Away");
    expect(text(otherRow.cells[2])).toBe("400"); // other room's score

    // The single team swing for the board, in the score column.
    expect(text(teamRow.cells[0])).toBe("Team result");
    expect(text(teamRow.cells[2])).toBe("+1 IMP");
  });

  it("gives the mirrored team result when viewed from the other table", () => {
    // Same board viewed by team A2 (table 2): swing = 400 − 430 = −30 = −1 IMP.
    const table = buildTeamBoardResultTable(match("3NTN+1", "3NTN="), 1, "A2NS");
    const teamRow = table!.rows[2];
    expect(text(teamRow.cells[2])).toBe("-1 IMP");
  });

  it("omits the team result until the other room has entered its result", () => {
    const table = buildTeamBoardResultTable(match("3NTN+1", null), 1, "A1NS");
    const [yourRow, otherRow, teamRow] = table!.rows;
    expect(text(yourRow.cells[2])).toBe("430"); // my score still shows
    expect(text(otherRow.cells[1])).toBe("—"); // no contract yet
    expect(text(otherRow.cells[2])).toBe("—"); // no score yet
    expect(text(teamRow.cells[2])).toBe("—"); // no team swing yet
  });
});
