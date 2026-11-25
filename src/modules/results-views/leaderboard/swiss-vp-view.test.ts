import { describe, it, expect } from "vitest";
import { buildSwissVpTable } from "./swiss-vp-view";
import type { PairSwissVpOverallScore } from "@/model/leaderboard";
import type { AssignedPair } from "@/model/participants";

function pair(id: string, first: string, last: string): AssignedPair {
  return {
    type: "PAIR",
    id,
    initialSeat: `A${id}NS` as AssignedPair["initialSeat"],
    player1: { id: 1, firstName: first, lastName: last, nationalId: null },
    player2: { id: 2, firstName: "Partner", lastName: last, nationalId: null },
  };
}

function score(
  lines: PairSwissVpOverallScore["lines"],
): PairSwissVpOverallScore {
  return { type: "PAIR_SWISS_VP", mode: "PAIR", scoring: "SWISS_VP", lines };
}

describe("buildSwissVpTable", () => {
  it("builds Rank / Pair / Total columns plus one per round (highest round wins)", () => {
    const table = buildSwissVpTable(
      score([
        {
          rank: 1,
          tied: false,
          pairId: "1",
          totalVP: 33,
          vpByRound: { 1: 15, 2: 18 },
        },
        {
          rank: 2,
          tied: false,
          pairId: "2",
          totalVP: 20,
          // Only round 3 scored so far — pushes the round-column count to 3.
          vpByRound: { 3: 20 },
        },
      ]),
      [pair("1", "Ada", "Lovelace"), pair("2", "Alan", "Turing")],
    );

    expect(table.columns.map((c) => c.label)).toEqual([
      "Rank",
      "Pair",
      "Total",
      "1",
      "2",
      "3",
    ]);
  });

  it("renders rank (with a tie marker), pair names, total and per-round VP", () => {
    const table = buildSwissVpTable(
      score([
        {
          rank: 1,
          tied: true,
          pairId: "1",
          totalVP: 15.5,
          vpByRound: { 1: 15.5 },
        },
      ]),
      [pair("1", "Ada", "Lovelace")],
    );

    const row = table.rows[0];
    expect(row.highlightIds).toEqual(["1"]);
    expect(row.cells[0]).toEqual({ kind: "text", value: "1=" });
    expect(row.cells[1]).toEqual({
      kind: "multiline",
      values: ["Ada Lovelace", "Partner Lovelace"],
    });
    // Total and round VP are formatted to two decimals.
    expect(row.cells[2]).toEqual({ kind: "number", value: 15.5, decimals: 2 });
    expect(row.cells[3]).toEqual({ kind: "number", value: 15.5, decimals: 2 });
  });

  it("leaves a round's cell blank when the pair has no VP for it", () => {
    const table = buildSwissVpTable(
      score([
        {
          rank: 1,
          tied: false,
          pairId: "1",
          totalVP: 12,
          vpByRound: { 2: 12 },
        },
      ]),
      [pair("1", "Ada", "Lovelace")],
    );

    // Round 1 (index 3) is blank; round 2 (index 4) has the VP.
    expect(table.rows[0].cells[3]).toEqual({ kind: "text", value: "" });
    expect(table.rows[0].cells[4]).toEqual({
      kind: "number",
      value: 12,
      decimals: 2,
    });
  });

  it("falls back to the raw pair id when the pair is not among participants", () => {
    const table = buildSwissVpTable(
      score([
        { rank: 1, tied: false, pairId: "99", totalVP: 0, vpByRound: {} },
      ]),
      [],
    );

    expect(table.rows[0].cells[1]).toEqual({
      kind: "multiline",
      values: ["99"],
    });
  });

  it("has no round columns before any round is scored", () => {
    const table = buildSwissVpTable(
      score([{ rank: 1, tied: false, pairId: "1", totalVP: 0, vpByRound: {} }]),
      [pair("1", "Ada", "Lovelace")],
    );

    expect(table.columns.map((c) => c.label)).toEqual([
      "Rank",
      "Pair",
      "Total",
    ]);
    expect(table.rows[0].cells).toHaveLength(3);
  });
});
