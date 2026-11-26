import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./storage/db/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
}));
vi.mock("./storage/db/queries/get-movement-spec", () => ({
  getPairMovementSpecById: vi.fn(),
}));

import { getPairMovement } from "./storage/db/queries/get-movement";
import { getPairMovementSpecById } from "./storage/db/queries/get-movement-spec";
import { describeMovement, getMovementDetail } from "./server";

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
