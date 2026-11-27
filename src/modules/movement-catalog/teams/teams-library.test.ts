import { describe, it, expect } from "vitest";
import type { Table } from "@/model/movement";
import type { StoredMovementTable } from "@/modules/movement-catalog/plan/describe-movement";
import {
  isAmericanWhistTeamsLayout,
  isCirculationTeamsLayout,
  isSupportedTeamsMovement,
  normaliseTeamsTables,
} from "./teams-library";
import { generateAmericanWhistTeams } from "@/modules/movement-catalog/generation/american-whist-teams/american-whist-teams";

/** A stored table from per-round [home, visitor, set] triples. */
function table(
  tableNumber: number,
  rooms: [number, number, number][],
): StoredMovementTable {
  return {
    tableNumber,
    rounds: rooms.map(([home, visitor, boardSet], i) => ({
      roundNumber: i + 1,
      ns: `${home}`,
      ew: `${visitor}`,
      boardSet,
    })),
  };
}

/**
 * Three teams, each meeting the others once, with a match's two rooms in
 * different rounds (team 1 hosts 2 in round 1; team 2 hosts 1 in round 2).
 */
const crossRound: StoredMovementTable[] = [
  table(1, [
    [1, 2, 1],
    [1, 3, 2],
  ]),
  table(2, [
    [2, 3, 3],
    [2, 1, 1],
  ]),
  table(3, [
    [3, 1, 2],
    [3, 2, 3],
  ]),
];

describe("isSupportedTeamsMovement", () => {
  it("accepts a movement whose match rooms are in different rounds", () => {
    expect(isSupportedTeamsMovement(crossRound)).toBe(true);
  });

  it("accepts a two-team match played in one round", () => {
    expect(
      isSupportedTeamsMovement([table(1, [[1, 2, 1]]), table(2, [[2, 1, 1]])]),
    ).toBe(true);
  });

  it("needs at least two tables numbered 1..n", () => {
    expect(isSupportedTeamsMovement([])).toBe(false);
    expect(isSupportedTeamsMovement([table(1, [[1, 1, 1]])])).toBe(false);
    expect(
      isSupportedTeamsMovement([table(1, [[1, 2, 1]]), table(3, [[3, 1, 1]])]),
    ).toBe(false);
  });

  it("needs each table's home team to be that table's team", () => {
    expect(
      isSupportedTeamsMovement([table(1, [[2, 1, 1]]), table(2, [[1, 2, 1]])]),
    ).toBe(false);
  });

  it("rejects a visitor that is not one of the teams", () => {
    expect(
      isSupportedTeamsMovement([table(1, [[1, 3, 1]]), table(2, [[2, 1, 1]])]),
    ).toBe(false);
    expect(
      isSupportedTeamsMovement([
        {
          tableNumber: 1,
          rounds: [{ roundNumber: 1, ns: "1", ew: "x", boardSet: 1 }],
        },
        table(2, [[2, 1, 1]]),
      ]),
    ).toBe(false);
  });

  it("rejects a team playing itself", () => {
    expect(
      isSupportedTeamsMovement([table(1, [[1, 1, 1]]), table(2, [[2, 2, 1]])]),
    ).toBe(false);
  });

  it("rejects a room listed twice", () => {
    expect(
      isSupportedTeamsMovement([
        table(1, [
          [1, 2, 1],
          [1, 2, 1],
        ]),
        table(2, [[2, 1, 1]]),
      ]),
    ).toBe(false);
  });

  it("needs every room's other room on the same boards", () => {
    expect(
      isSupportedTeamsMovement([table(1, [[1, 2, 1]]), table(2, [[2, 1, 2]])]),
    ).toBe(false);
  });

  it("rejects two teams meeting twice", () => {
    expect(
      isSupportedTeamsMovement([
        table(1, [
          [1, 2, 1],
          [1, 2, 2],
        ]),
        table(2, [
          [2, 1, 1],
          [2, 1, 2],
        ]),
      ]),
    ).toBe(false);
  });

  it("rejects a team playing the same board set in two matches", () => {
    expect(
      isSupportedTeamsMovement([
        table(1, [
          [1, 2, 1],
          [1, 3, 1],
        ]),
        table(2, [[2, 1, 1]]),
        table(3, [[3, 1, 1]]),
      ]),
    ).toBe(false);
  });
});

/** A parsed table whose rounds all have the given home and visitors. */
function parsed(table: number, home: string, visitors: string[]): Table {
  return {
    table,
    rounds: visitors.map((ewId, i) => ({
      round: i + 1,
      boards: [i + 1],
      participants: { nsId: home, ewId },
    })),
  };
}

describe("normaliseTeamsTables", () => {
  it("puts rows into team order so table T is team T's home", () => {
    const out = normaliseTeamsTables([
      parsed(1, "2", ["1"]),
      parsed(2, "1", ["2"]),
    ]);
    expect(out.map((t) => [t.table, t.rounds[0].participants.nsId])).toEqual([
      [1, "1"],
      [2, "2"],
    ]);
  });

  it("leaves rows as read when a home team changes between rounds", () => {
    const tables = [
      {
        table: 1,
        rounds: [
          { round: 1, boards: [1], participants: { nsId: "1", ewId: "2" } },
          { round: 2, boards: [2], participants: { nsId: "2", ewId: "1" } },
        ],
      },
      parsed(2, "2", ["1"]),
    ];
    expect(normaliseTeamsTables(tables)).toBe(tables);
  });

  it("leaves rows as read when the home teams are not 1..n", () => {
    const tables = [parsed(1, "1", ["3"]), parsed(2, "3", ["1"])];
    expect(normaliseTeamsTables(tables)).toBe(tables);
  });
});

/** A generated American Whist as stored tables. */
function americanWhist(teams: number): StoredMovementTable[] {
  return generateAmericanWhistTeams({ teams, boardsPerRound: 1 }).tables.map(
    (t) => ({
      tableNumber: t.table,
      rounds: t.rounds.map((r) => ({
        roundNumber: r.round,
        ns: `${parseInt(r.participants.nsId, 10)}`,
        ew: `${parseInt(r.participants.ewId, 10)}`,
        boardSet: r.boards[0],
      })),
    }),
  );
}

describe("isAmericanWhistTeamsLayout", () => {
  it("recognises an American Whist from any starting position", () => {
    expect(isAmericanWhistTeamsLayout(americanWhist(5))).toBe(true);
    // The same movement with its board sets relabelled one on.
    const shifted = americanWhist(7).map((t) => ({
      ...t,
      rounds: t.rounds.map((r) => ({ ...r, boardSet: (r.boardSet % 7) + 1 })),
    }));
    expect(isAmericanWhistTeamsLayout(shifted)).toBe(true);
  });

  it("is not an American Whist when the moves differ or rounds are missing", () => {
    expect(isAmericanWhistTeamsLayout(crossRound)).toBe(false);
    expect(
      isAmericanWhistTeamsLayout(
        americanWhist(5).map((t) => ({ ...t, rounds: t.rounds.slice(1) })),
      ),
    ).toBe(false);
    expect(isAmericanWhistTeamsLayout(americanWhist(3).slice(0, 2))).toBe(
      false,
    );
  });
});

describe("isCirculationTeamsLayout", () => {
  // The NBL 4 Teams Circulation: every table on the same set each round.
  const circulation: StoredMovementTable[] = [
    table(1, [
      [1, 2, 1],
      [1, 3, 2],
      [1, 4, 3],
    ]),
    table(2, [
      [2, 1, 1],
      [2, 4, 2],
      [2, 3, 3],
    ]),
    table(3, [
      [3, 4, 1],
      [3, 1, 2],
      [3, 2, 3],
    ]),
    table(4, [
      [4, 3, 1],
      [4, 2, 2],
      [4, 1, 3],
    ]),
  ];

  it("recognises a four-team Circulation", () => {
    expect(isSupportedTeamsMovement(circulation)).toBe(true);
    expect(isCirculationTeamsLayout(circulation)).toBe(true);
  });

  it("is not a Circulation for another team count or round count", () => {
    expect(isCirculationTeamsLayout(crossRound)).toBe(false);
    expect(
      isCirculationTeamsLayout(
        circulation.map((t) => ({ ...t, rounds: t.rounds.slice(1) })),
      ),
    ).toBe(false);
  });

  it("is not a Circulation when a team meets another twice", () => {
    const repeat = circulation.map((t, i) =>
      i === 0
        ? table(1, [
            [1, 2, 1],
            [1, 2, 2],
            [1, 4, 3],
          ])
        : t,
    );
    expect(isCirculationTeamsLayout(repeat)).toBe(false);
  });

  it("is not a Circulation when the tables play different sets in a round", () => {
    const staggered = circulation.map((t, i) =>
      i === 3
        ? table(4, [
            [4, 3, 2],
            [4, 2, 2],
            [4, 1, 3],
          ])
        : t,
    );
    expect(isCirculationTeamsLayout(staggered)).toBe(false);
  });
});
