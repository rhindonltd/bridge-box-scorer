import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateThurnerTeams } from "@/modules/movement-catalog/generation/thurner-teams/thurner-teams";

vi.mock("./storage/db/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
}));
vi.mock("./storage/db/queries/get-movement-spec", () => ({
  getPairMovementSpecById: vi.fn(),
  getTeamMovementSpecById: vi.fn(),
}));
vi.mock("./storage/db/queries/get-movements", () => ({
  getPairMovementSpecsForTables: vi.fn(),
  getTeamMovementSpecsForTables: vi.fn(),
  getTeamMovementRooms: vi.fn(),
}));

import { getPairMovement } from "./storage/db/queries/get-movement";
import {
  getPairMovementSpecById,
  getTeamMovementSpecById,
} from "./storage/db/queries/get-movement-spec";
import {
  getTeamMovementRooms,
  getTeamMovementSpecsForTables,
} from "./storage/db/queries/get-movements";
import {
  describeMovement,
  getMovementDetail,
  getTeamMovementDetail,
  listTeamMovements,
} from "./server";

describe("getMovementDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  const rows = [
    {
      tableNumber: 1,
      rounds: [{ roundNumber: 1, ns: "1", ew: "2", boardSet: 2 }],
    },
  ];

  it("lays out a pairs movement at its own boards-per-round", async () => {
    vi.mocked(getPairMovement).mockResolvedValue(rows as never);
    vi.mocked(getPairMovementSpecById).mockResolvedValue({
      name: "Howell",
      boardsPerRound: 3,
    } as never);

    expect(await getMovementDetail(5)).toEqual({
      name: "Howell",
      tables: [
        {
          tableNumber: 1,
          rounds: [
            { roundNumber: 1, ns: "1", ew: "2", boardStart: 4, boardEnd: 6 },
          ],
        },
      ],
    });
    expect(getPairMovement).toHaveBeenCalledWith(5);
  });

  it("is null when no movement has the id", async () => {
    vi.mocked(getPairMovement).mockResolvedValue([] as never);
    vi.mocked(getPairMovementSpecById).mockResolvedValue(null as never);
    expect(await getMovementDetail(99)).toBeNull();
  });
});

describe("describeMovement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates a Mitchell without reading movements.db", async () => {
    const description = await describeMovement({
      source: "MITCHELL",
      mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
    });
    expect(description.layout).toHaveLength(3);
    expect(getPairMovement).not.toHaveBeenCalled();
  });

  it("reads a stored spec's rows and missing pair", async () => {
    vi.mocked(getPairMovement).mockResolvedValue([
      {
        tableNumber: 1,
        rounds: [{ roundNumber: 1, ns: "1", ew: "2", boardSet: 2 }],
      },
    ] as never);
    vi.mocked(getPairMovementSpecById).mockResolvedValue({
      missingPair: 2,
    } as never);

    const description = await describeMovement({
      source: "SPEC",
      specId: 7,
      boardsPerRound: 3,
    });

    expect(getPairMovement).toHaveBeenCalledWith(7);
    expect(getPairMovementSpecById).toHaveBeenCalledWith(7);
    expect(description.missingPair).toBe(2);
    expect(description.layout[0].rounds[0]).toMatchObject({
      boardStart: 4,
      boardEnd: 6,
    });
  });

  it("has no missing pair when the spec row is not found", async () => {
    vi.mocked(getPairMovement).mockResolvedValue([] as never);
    vi.mocked(getPairMovementSpecById).mockResolvedValue(undefined as never);

    const description = await describeMovement({
      source: "SPEC",
      specId: 7,
      boardsPerRound: 3,
    });

    expect(description.missingPair).toBeNull();
  });
});

/** A room of a stored teams movement, as the rooms query returns it. */
function room(
  movementId: number,
  tableNumber: number,
  roundNumber: number,
  ew: string,
  boardSet: number,
) {
  return {
    movementId,
    tableNumber,
    roundNumber,
    ns: `${tableNumber}`,
    ew,
    boardSet,
  };
}

// Movement 1 is a two-team match (both rooms on set 1), listed out of order
// to show the rooms are sorted. Movement 2 has a team playing itself.
const teamRooms = [
  room(1, 2, 1, "1", 1),
  room(1, 1, 1, "2", 1),
  room(2, 1, 1, "1", 1),
  room(2, 2, 1, "2", 1),
];
const teamSpec = (id: number, name: string) => ({
  id,
  name,
  type: "5",
  tables: 2,
  boards: 8,
  boardsPerRound: 4,
  rounds: 1,
});

describe("stored teams movements", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists only the team count's movements the app can run", async () => {
    vi.mocked(getTeamMovementSpecsForTables).mockResolvedValue([
      teamSpec(1, "Match"),
      teamSpec(2, "Pivot"),
      teamSpec(3, "No rows"),
    ]);
    vi.mocked(getTeamMovementRooms).mockResolvedValue(teamRooms);
    expect(await listTeamMovements(2)).toEqual([
      {
        id: 1,
        name: "Match",
        tables: 2,
        boards: 8,
        boardsPerRound: 4,
        rounds: 1,
      },
    ]);
    expect(getTeamMovementSpecsForTables).toHaveBeenCalledWith(2);
    expect(getTeamMovementRooms).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("leaves out the library's American Whist movements", async () => {
    // A 3-team American Whist: team t hosts t + 2k on set t + k − 1.
    const aw = [
      room(4, 1, 1, "3", 1),
      room(4, 1, 2, "2", 2),
      room(4, 2, 1, "1", 2),
      room(4, 2, 2, "3", 3),
      room(4, 3, 1, "2", 3),
      room(4, 3, 2, "1", 1),
    ];
    vi.mocked(getTeamMovementSpecsForTables).mockResolvedValue([
      { ...teamSpec(4, "American Whist"), tables: 3, rounds: 2 },
    ]);
    vi.mocked(getTeamMovementRooms).mockResolvedValue(aw);
    expect(await listTeamMovements(3)).toEqual([]);
  });

  it("leaves out the library's Thurner movements", async () => {
    const thurner = generateThurnerTeams({
      teams: 6,
      boardsPerRound: 1,
    }).tables.flatMap((t) =>
      t.rounds.map((r) =>
        room(
          6,
          t.table,
          r.round,
          `${parseInt(r.participants.ewId, 10)}`,
          r.boards[0],
        ),
      ),
    );
    vi.mocked(getTeamMovementSpecsForTables).mockResolvedValue([
      { ...teamSpec(6, "Thurner"), tables: 6, rounds: 5 },
    ]);
    vi.mocked(getTeamMovementRooms).mockResolvedValue(thurner);
    expect(await listTeamMovements(6)).toEqual([]);
  });

  it("leaves out the library's Circulation movements", async () => {
    // Four teams, every table on the round's one set: 1v2 3v4, 1v3 2v4, 1v4 2v3.
    const opponents = [
      [2, 3, 4],
      [1, 4, 3],
      [4, 1, 2],
      [3, 2, 1],
    ];
    const circulation = opponents.flatMap((row, t) =>
      row.map((visitor, k) => room(5, t + 1, k + 1, `${visitor}`, k + 1)),
    );
    vi.mocked(getTeamMovementSpecsForTables).mockResolvedValue([
      { ...teamSpec(5, "Circulation"), tables: 4, rounds: 3 },
    ]);
    vi.mocked(getTeamMovementRooms).mockResolvedValue(circulation);
    expect(await listTeamMovements(4)).toEqual([]);
  });

  it("lays out a supported movement for the preview", async () => {
    vi.mocked(getTeamMovementRooms).mockResolvedValue(
      teamRooms.filter((r) => r.movementId === 1),
    );
    vi.mocked(getTeamMovementSpecById).mockResolvedValue(teamSpec(1, "Match"));
    expect(await getTeamMovementDetail(1)).toEqual({
      name: "Match",
      tables: [
        {
          tableNumber: 1,
          rounds: [
            { roundNumber: 1, ns: "1", ew: "2", boardStart: 1, boardEnd: 4 },
          ],
        },
        {
          tableNumber: 2,
          rounds: [
            { roundNumber: 1, ns: "2", ew: "1", boardStart: 1, boardEnd: 4 },
          ],
        },
      ],
    });
  });

  it("has no detail for a missing or unsupported movement", async () => {
    vi.mocked(getTeamMovementRooms).mockResolvedValue([]);
    vi.mocked(getTeamMovementSpecById).mockResolvedValue(null);
    expect(await getTeamMovementDetail(9)).toBeNull();

    vi.mocked(getTeamMovementRooms).mockResolvedValue(
      teamRooms.filter((r) => r.movementId === 2),
    );
    vi.mocked(getTeamMovementSpecById).mockResolvedValue(teamSpec(2, "Pivot"));
    expect(await getTeamMovementDetail(2)).toBeNull();
  });

  it("describes a selected teams movement from its rooms", async () => {
    vi.mocked(getTeamMovementRooms).mockResolvedValue(
      teamRooms.filter((r) => r.movementId === 1),
    );
    const description = await describeMovement({
      source: "TEAMS_SPEC",
      specId: 1,
      boardsPerRound: 2,
    });
    expect(
      description.layout.map((t) => [
        t.tableNumber,
        t.rounds[0].ns,
        t.rounds[0].ew,
      ]),
    ).toEqual([
      [1, "1NS", "2EW"],
      [2, "2NS", "1EW"],
    ]);
    expect(getTeamMovementRooms).toHaveBeenCalledWith([1]);
  });
});
