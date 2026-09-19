import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRun = vi.fn();
const del = vi.fn(() => ({ run: mockRun }));
const tx = { delete: del };
const transaction = vi.fn((cb: (t: typeof tx) => void) => cb(tx));

vi.mock("@/db/movements", () => ({
  getDb: vi.fn(async () => ({ transaction })),
}));

vi.mock("@/db/movements/actions/create-movement-spec", () => ({
  createPairMovementSpec: vi.fn(async () => 1),
  createTeamMovementSpec: vi.fn(async () => 2),
}));
vi.mock("@/db/movements/actions/create-movement-table-spec", () => ({
  createPairMovementTableSpec: vi.fn(async () => 10),
  createTeamMovementTableSpec: vi.fn(async () => 20),
}));
vi.mock("@/db/movements/actions/create-movement-round-spec", () => ({
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

vi.mock("@/movement/pairsMovements", () => ({
  generatePairsMovements: vi.fn(() => pairMovements),
}));
vi.mock("@/movement/teamsMovements", () => ({
  generateTeamsMovements: vi.fn(() => teamMovements),
}));
vi.mock("@/movement/shared", () => ({
  boardSetFor: vi.fn(() => 0),
}));

import { refreshMovements } from "./refresh-movements";
import { createPairMovementRoundSpec } from "@/db/movements/actions/create-movement-round-spec";

describe("refreshMovements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wipes the six spec tables in one transaction, then reseeds and returns counts", async () => {
    const result = await refreshMovements();

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
