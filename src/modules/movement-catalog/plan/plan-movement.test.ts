import { describe, it, expect } from "vitest";
import type { Tables } from "@/model/movement";
import { generateRoundRobinTeams } from "@/modules/movement-catalog/generation/round-robin-teams/round-robin-teams-pairing";
import {
  describeGeneratedMovement,
  type MovementDescription,
} from "./describe-movement";
import {
  planMovement,
  roundRobinTeamsToMaterializable,
  tablesToMaterializableMovement,
} from "./plan-movement";

describe("tablesToMaterializableMovement", () => {
  it("maps table/round shape and derives boardStart/boardEnd from the boards array", () => {
    const tables: Tables = {
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

    expect(tablesToMaterializableMovement(tables)).toEqual([
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

describe("roundRobinTeamsToMaterializable", () => {
  it("maps a generated round robin to every table's per-round board rows", () => {
    const teams = 6;
    const rounds = teams - 1;
    const boardsPerRound = 4;

    const movement = roundRobinTeamsToMaterializable(
      generateRoundRobinTeams({ teams, rounds, boardsPerRound }),
    );

    // One materializable table per team, each carrying every round.
    expect(movement.map((t) => t.tableNumber)).toEqual([1, 2, 3, 4, 5, 6]);

    for (const table of movement) {
      expect(table.rounds.map((r) => r.roundNumber)).toEqual([1, 2, 3, 4, 5]);

      for (const round of table.rounds) {
        // Board range comes straight from boardsPerRound (round r plays set r).
        expect(round.boardStart).toBe(
          (round.roundNumber - 1) * boardsPerRound + 1,
        );
        expect(round.boardEnd).toBe(round.roundNumber * boardsPerRound);

        // Home NS pair is this table's own team; away EW pair is another team.
        expect(round.ns).toBe(`${table.tableNumber}NS`);
        expect(round.ew).toMatch(/^\d+EW$/);
        const away = Number(round.ew.replace(/EW$/, ""));
        expect(away).not.toBe(table.tableNumber);
      }
    }
  });
});

describe("planMovement", () => {
  const mitchellSpec = { tables: 3, rounds: 3, boardsPerRound: 2 };

  it("returns the layout unchanged when every seat is filled", () => {
    const description = describeGeneratedMovement({
      source: "MITCHELL",
      mitchell: mitchellSpec,
    });
    expect(planMovement(description, { sitOutSeat: null })).toBe(
      description.layout,
    );
  });

  it("regenerates a Standard Mitchell with the empty seat's pair sitting out", () => {
    const description = describeGeneratedMovement({
      source: "MITCHELL",
      mitchell: mitchellSpec,
    });
    const plan = planMovement(description, { sitOutSeat: "A2EW" });
    expect(plan.flatMap((t) => t.rounds).filter((r) => r.sitOut)).toHaveLength(
      3,
    );
  });

  it.each(["skip", "shareAndRelay", "hesitation", "web", "americanWhist"])(
    "rejects a sit-out for a %s Mitchell",
    (flag) => {
      const description: MovementDescription = {
        selected: {
          source: "MITCHELL",
          mitchell: { ...mitchellSpec, [flag]: true },
        },
        layout: [],
        missingPair: null,
      };
      expect(() => planMovement(description, { sitOutSeat: "A2EW" })).toThrow(
        "Sit-out handling is only supported for Standard Mitchell movements.",
      );
    },
  );

  const specLayout = [
    {
      tableNumber: 1,
      rounds: [
        { roundNumber: 1, ns: "1", ew: "2", boardStart: 1, boardEnd: 2 },
        { roundNumber: 2, ns: "1", ew: "3", boardStart: 3, boardEnd: 4 },
      ],
    },
    {
      tableNumber: 2,
      rounds: [
        { roundNumber: 1, ns: "3", ew: "4", boardStart: 3, boardEnd: 4 },
        { roundNumber: 2, ns: "2", ew: "4", boardStart: 1, boardEnd: 2 },
      ],
    },
  ];
  const spec = { source: "SPEC", specId: 1, boardsPerRound: 2 } as const;

  it("makes the position at the empty seat the phantom for a spec with no missing pair", () => {
    const plan = planMovement(
      { selected: spec, layout: specLayout, missingPair: null },
      { sitOutSeat: "A2EW" },
    );
    // Position 4 starts at 2EW: both its rounds sit out.
    expect(
      plan.flatMap((t) => t.rounds.filter((r) => r.sitOut).map((r) => r.ew)),
    ).toEqual(["4", "4"]);
  });

  it("flags a spec's built-in missing pair", () => {
    const plan = planMovement(
      { selected: spec, layout: specLayout, missingPair: 4 },
      { sitOutSeat: "A2EW" },
    );
    expect(
      plan.flatMap((t) => t.rounds.filter((r) => r.sitOut).map((r) => r.ew)),
    ).toEqual(["4", "4"]);
  });

  it("generates the whole Teams Round Robin schedule", () => {
    const roundRobinTeams = { teams: 4, rounds: 3, boardsPerRound: 4 };
    const description = describeGeneratedMovement({
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams,
    });
    expect(planMovement(description, { sitOutSeat: null })).toEqual(
      roundRobinTeamsToMaterializable(generateRoundRobinTeams(roundRobinTeams)),
    );
  });
});
