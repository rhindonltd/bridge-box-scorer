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

describe("buildTeamBoardResultTable — played-reversed room", () => {
  /**
   * Traveller instances arrive with a flagged table's ns/ew already exchanged
   * (the teams credited with the result), plus `seatsSwapped`.
   */
  function withTable1Reversed(): TeamBoardResultLine[] {
    return [
      {
        tableNumber: 1,
        ns: "A2EW",
        ew: "A1NS",
        result: "3NTN+1" as never,
        seatsSwapped: true,
      },
      { tableNumber: 2, ns: "A2NS", ew: "A1EW", result: "3NTN=" as never },
    ];
  }

  it("scores the reversed room from the opposite perspective and swings the team result", () => {
    // Unflagged, team A1 nets 430 − 400 = +30 (+1 IMP). With table 1 played
    // reversed, A1 held the EW hands there: −430 − 400 = −830 → a big loss.
    const flagged = buildTeamBoardResultTable(withTable1Reversed(), 1, "A1NS");
    const plain = buildTeamBoardResultTable(match("3NTN+1", "3NTN="), 1, "A1NS");

    expect(flagged).not.toBeNull();
    expect(text(flagged!.rows[0].cells[2])).toBe("-430");
    expect(text(flagged!.rows[1].cells[2])).toBe("400");
    expect(text(plain!.rows[2].cells[2])).toBe("+1 IMP");
    expect(text(flagged!.rows[2].cells[2])).toMatch(/^-\d+ IMP$/);
    // The contract shown is the one actually played, unchanged.
    expect(text(flagged!.rows[0].cells[1])).toBe(text(plain!.rows[0].cells[1]));
  });

  it("keeps both rooms filed correctly when viewed from the other table", () => {
    const table = buildTeamBoardResultTable(withTable1Reversed(), 1, "A2NS");
    expect(table).not.toBeNull();
    expect(text(table!.rows[0].cells[2])).toBe("400");
    expect(text(table!.rows[1].cells[2])).toBe("-430");
  });
});

describe("buildTeamBoardResultTable — edge cases", () => {
  it("ignores sit-out and half-average lines and lines with an unparseable opposing seat", () => {
    const lines: TeamBoardResultLine[] = [
      ...match("3NTN+1", "3NTN="),
      { tableNumber: 3, ns: "A3NS", ew: "A4EW", result: null, status: "SIT_OUT" } as never,
      { tableNumber: 4, ns: "A5NS", ew: "A6EW", result: null, status: "HALF_AVERAGE" } as never,
      { tableNumber: 5, ns: "A7NS", ew: "BAD", result: null } as never,
    ];
    const table = buildTeamBoardResultTable(lines, 1, "A1NS");
    expect(table).not.toBeNull();
    expect(table!.rows).toHaveLength(3);
  });

  it("returns null when the viewing table has no row of its own for the board", () => {
    // Only table 2's row exists; viewing from table 1 there is nothing to show.
    const onlyAway: TeamBoardResultLine[] = [
      { tableNumber: 2, ns: "A2NS", ew: "A1EW", result: "3NTN=" as never },
    ];
    expect(buildTeamBoardResultTable(onlyAway, 1, "A1NS")).toBeNull();
  });

  it("shows dashes for my own missing result and omits the team result", () => {
    const table = buildTeamBoardResultTable(match(null, "3NTN="), 1, "A1NS");
    const [yourRow, otherRow] = table!.rows;
    expect(text(yourRow.cells[1])).toBe("—");
    expect(text(yourRow.cells[2])).toBe("—");
    expect(text(otherRow.cells[2])).toBe("400");
  });

  it("highlights nothing for the away row when the other room has no line", () => {
    const onlyHome: TeamBoardResultLine[] = [
      { tableNumber: 1, ns: "A1NS", ew: "A2EW", result: "3NTN+1" as never },
    ];
    const table = buildTeamBoardResultTable(onlyHome, 1, "A1NS");
    expect(table!.rows[1].highlightIds).toEqual([]);
    expect(text(table!.rows[1].cells[2])).toBe("—");
  });
});
