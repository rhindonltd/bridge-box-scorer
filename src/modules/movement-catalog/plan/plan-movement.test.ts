import { describe, it, expect } from "vitest";
import type { Tables } from "@/model/movement";
import {
  describeGeneratedMovement,
  type MovementDescription,
} from "./describe-movement";
import {
  planMovement,
  teamsLayoutToMaterializable,
  tablesToMaterializableMovement,
} from "./plan-movement";

describe("tablesToMaterializableMovement", () => {
  it("records the start board of a round listed part-way through its run", () => {
    const tables: Tables = {
      tables: [
        {
          table: 2,
          rounds: [
            {
              round: 1,
              boards: [3, 4, 1, 2],
              participants: { nsId: "2NS", ewId: "1EW" },
            },
          ],
        },
      ],
    };
    expect(tablesToMaterializableMovement(tables)[0].rounds[0]).toEqual({
      roundNumber: 1,
      ns: "2NS",
      ew: "1EW",
      boardStart: 1,
      boardEnd: 4,
      firstBoard: 3,
      boardCopy: undefined,
    });
  });

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

  it("plans an American Whist's whole schedule as teams matches", () => {
    const americanWhistTeams = { teams: 3, boardsPerRound: 2 };
    const description = describeGeneratedMovement({
      source: "AMERICAN_WHIST_TEAMS",
      americanWhistTeams,
    });
    const plan = planMovement(description, { sitOutSeat: null });
    expect(plan).toEqual(teamsLayoutToMaterializable(description.layout, 2));
    // Team 1 hosts team 3 in round 1 on set 1; team 3 hosts team 1 in round 2
    // on the same set: one match, numbered by its set.
    expect(plan[0].rounds[0].match).toMatchObject({
      key: "teams|1-3",
      roundNumber: 1,
    });
    expect(plan[2].rounds[1].match).toMatchObject({
      key: "teams|1-3",
      roundNumber: 1,
    });
  });
});

describe("planMovement — Circulation", () => {
  it("plans each round as one match per pair of teams, numbered by round", () => {
    const description = describeGeneratedMovement({
      source: "CIRCULATION_TEAMS",
      circulationTeams: { boardsPerRound: 8 },
    });
    const plan = planMovement(description, { sitOutSeat: null });
    expect(plan).toEqual(teamsLayoutToMaterializable(description.layout, 8));
    // Round 2: team 1 hosts team 3, and team 3 hosts team 1, on boards 9-16.
    expect(plan[0].rounds[1].match).toMatchObject({
      key: "teams|1-3",
      roundNumber: 2,
    });
    expect(plan[2].rounds[1]).toMatchObject({
      firstBoard: 13,
      match: { key: "teams|1-3", roundNumber: 2 },
    });
  });
});

describe("planMovement — Thurner", () => {
  it("plans the whole schedule as teams matches", () => {
    const description = describeGeneratedMovement({
      source: "THURNER_TEAMS",
      thurnerTeams: { teams: 6, boardsPerRound: 2 },
    });
    const plan = planMovement(description, { sitOutSeat: null });
    expect(plan).toEqual(teamsLayoutToMaterializable(description.layout, 2));
    expect(plan[5].rounds[0]).toMatchObject({
      sharesWith: 1,
      match: { key: "teams|1-6", roundNumber: 1 },
    });
  });
});

describe("planMovement — Stagger", () => {
  it("plans the whole schedule as teams matches", () => {
    const description = describeGeneratedMovement({
      source: "STAGGER_TEAMS",
      staggerTeams: { teams: 6, boardsPerRound: 2 },
    });
    const plan = planMovement(description, { sitOutSeat: null });
    expect(plan).toEqual(teamsLayoutToMaterializable(description.layout, 2));
    expect(plan[0].rounds[0].match).toMatchObject({ key: "teams|1-3" });
  });
});

describe("teamsLayoutToMaterializable", () => {
  // Team 1 hosts 2 in round 1 on set 2; team 2 hosts 1 in round 2 on set 2.
  const layout = [
    {
      tableNumber: 1,
      rounds: [
        { roundNumber: 1, ns: "1NS", ew: "2EW", boardStart: 3, boardEnd: 4 },
      ],
    },
    {
      tableNumber: 2,
      rounds: [
        { roundNumber: 2, ns: "2NS", ew: "1EW", boardStart: 3, boardEnd: 4 },
      ],
    },
  ];
  const match = {
    kind: "TEAMS",
    scoredAsUnit: true,
    key: "teams|1-2",
    home: "1NS",
    opponent: "2NS",
    vpPool: 20,
    roundNumber: 2,
  };

  it("groups a match's two rooms by the teams, numbered by board set", () => {
    const plan = teamsLayoutToMaterializable(layout, 2);
    expect(plan.map((t) => t.rounds[0].match)).toEqual([match, match]);
  });

  it("plans the described layout as it is", () => {
    const description: MovementDescription = {
      selected: { source: "TEAMS_SPEC", specId: 1, boardsPerRound: 2 },
      layout,
      missingPair: null,
    };
    expect(planMovement(description, { sitOutSeat: null })).toEqual(
      teamsLayoutToMaterializable(layout, 2),
    );
  });
});
