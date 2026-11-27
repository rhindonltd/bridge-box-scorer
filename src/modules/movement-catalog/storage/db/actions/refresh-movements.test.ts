import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRun = vi.fn();
const del = vi.fn(() => ({ run: mockRun }));
const tx = { delete: del };
const transaction = vi.fn((cb: (t: typeof tx) => void) => cb(tx));

vi.mock("@/modules/movement-catalog/storage/db", () => ({
  getDb: vi.fn(async () => ({ transaction })),
}));

vi.mock("./create-movement-spec", () => ({
  createPairMovementSpec: vi.fn(async () => 1),
  createTeamMovementSpec: vi.fn(async () => 2),
}));
vi.mock("./create-movement-table-spec", () => ({
  createPairMovementTableSpec: vi.fn(async () => 10),
  createTeamMovementTableSpec: vi.fn(async () => 20),
}));
vi.mock("./create-movement-round-spec", () => ({
  createPairMovementRoundSpec: vi.fn(),
  createTeamMovementRoundSpec: vi.fn(),
}));

const pairMovements = [
  {
    name: "Standard Mitchell",
    type: 1,
    tables: 2,
    boards: 4,
    boardsPerRound: 2,
    rounds: 2,
    missingParticipant: null,
    tableData: [
      {
        table: 1,
        rounds: [
          { participants: { nsId: 1, ewId: 2 }, boards: [1] },
          { participants: { nsId: 1, ewId: 3 }, boards: [3] },
        ],
      },
    ],
  },
];
const teamMovements = [
  {
    name: "RR Teams",
    type: 2,
    tables: 2,
    boards: 4,
    boardsPerRound: 2,
    rounds: 1,
    tableData: [
      {
        table: 1,
        rounds: [{ participants: { nsId: 1, ewId: 2 }, boards: [1] }],
      },
    ],
  },
];

vi.mock("@/modules/movement-catalog/storage/pairsMovements", () => ({
  generatePairsMovements: vi.fn(() => pairMovements),
}));
vi.mock("@/modules/movement-catalog/storage/teamsMovements", () => ({
  generateTeamsMovements: vi.fn(() => teamMovements),
}));
vi.mock("@/modules/movement-catalog/shared", () => ({
  boardSetFor: vi.fn(() => 0),
}));

import { refreshCatalog } from "./refresh-movements";
import { createPairMovementRoundSpec } from "./create-movement-round-spec";

describe("refreshCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wipes the six spec tables in one transaction, then reseeds and returns counts", async () => {
    const result = await refreshCatalog();

    // One transaction wrapping six deletes (rounds -> tables -> specs, both
    // pair and team).
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledTimes(6);
    expect(mockRun).toHaveBeenCalledTimes(6);

    // Reseed walked the pair movement's single table with two rounds.
    expect(vi.mocked(createPairMovementRoundSpec)).toHaveBeenCalledTimes(2);

    expect(result).toEqual({ pairs: 1, teams: 1 });
  });
});
