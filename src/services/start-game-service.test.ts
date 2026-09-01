import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- mocks for the movements DB layer used by rehydration ----

vi.mock("@/db/movements/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
}));

vi.mock("@/db/movements/queries/get-movement-spec", () => ({
  getPairMovementSpecById: vi.fn(),
}));

import { getPairMovement } from "@/db/movements/queries/get-movement";
import { getPairMovementSpecById } from "@/db/movements/queries/get-movement-spec";
import { resolveStart } from "./start-game-service";
import { PairSeat } from "@/model/participants";

function seatsForTables(tables: number): PairSeat[] {
  const seats: PairSeat[] = [];
  for (let t = 1; t <= tables; t++) {
    seats.push(`${t}NS`, `${t}EW`);
  }
  return seats;
}

function playsBoards(round: { boardStart: number; boardEnd: number }): boolean {
  return round.boardEnd >= round.boardStart;
}

describe("resolveStart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NO_MOVEMENT_SELECTED when nothing is selected", async () => {
    const result = await resolveStart(null, ["1NS", "1EW"]);
    expect(result.validation.canStart).toBe(false);
    expect(result.movement).toBeNull();
    expect(result.validation.problems.map((p) => p.code)).toContain(
      "NO_MOVEMENT_SELECTED",
    );
  });

  it("resolves a fully-seated Mitchell without a sit-out", async () => {
    const result = await resolveStart(
      { source: "MITCHELL", mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 } },
      seatsForTables(5),
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBeNull();
    expect(result.movement).not.toBeNull();
    // Every round plays boards (no sit-out).
    const anyEmpty = result.movement!.some((t) =>
      t.rounds.some((r) => !playsBoards(r)),
    );
    expect(anyEmpty).toBe(false);
  });

  it("resolves a one-short Mitchell with a sit-out applied", async () => {
    const seated = seatsForTables(5).filter((s) => s !== "3EW");

    const result = await resolveStart(
      { source: "MITCHELL", mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 } },
      seated,
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBe("3EW");
    // Exactly one sit-out per round => 5 blanked rounds total.
    const emptyCount = result.movement!.flatMap((t) => t.rounds).filter(
      (r) => !playsBoards(r),
    ).length;
    expect(emptyCount).toBe(5);
  });

  it("rejects a Mitchell that is two pairs short", async () => {
    const seated = seatsForTables(5).filter(
      (s) => s !== "4NS" && s !== "4EW" && s !== "5NS",
    );

    const result = await resolveStart(
      { source: "MITCHELL", mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 } },
      seated,
    );

    expect(result.validation.canStart).toBe(false);
    expect(result.movement).toBeNull();
    expect(result.validation.problems.map((p) => p.code)).toContain(
      "MULTIPLE_EMPTY_POSITIONS",
    );
  });

  it("resolves a database spec with no missing pair (introduces a phantom)", async () => {
    // 3-table two-winner spec (NS 1..3, EW 4..6 rotating).
    vi.mocked(getPairMovement).mockResolvedValue([
      {
        id: 1,
        movementId: 0,
        tableNumber: 1,
        rounds: [
          { id: 0, tableId: 1, roundNumber: 1, ns: "1", ew: "4", boardStart: 1, boardEnd: 2 },
          { id: 0, tableId: 1, roundNumber: 2, ns: "1", ew: "6", boardStart: 3, boardEnd: 4 },
          { id: 0, tableId: 1, roundNumber: 3, ns: "1", ew: "5", boardStart: 5, boardEnd: 6 },
        ],
      },
      {
        id: 2,
        movementId: 0,
        tableNumber: 2,
        rounds: [
          { id: 0, tableId: 2, roundNumber: 1, ns: "2", ew: "5", boardStart: 1, boardEnd: 2 },
          { id: 0, tableId: 2, roundNumber: 2, ns: "2", ew: "4", boardStart: 3, boardEnd: 4 },
          { id: 0, tableId: 2, roundNumber: 3, ns: "2", ew: "6", boardStart: 5, boardEnd: 6 },
        ],
      },
      {
        id: 3,
        movementId: 0,
        tableNumber: 3,
        rounds: [
          { id: 0, tableId: 3, roundNumber: 1, ns: "3", ew: "6", boardStart: 1, boardEnd: 2 },
          { id: 0, tableId: 3, roundNumber: 2, ns: "3", ew: "5", boardStart: 3, boardEnd: 4 },
          { id: 0, tableId: 3, roundNumber: 3, ns: "3", ew: "4", boardStart: 5, boardEnd: 6 },
        ],
      },
    ] as any);
    vi.mocked(getPairMovementSpecById).mockResolvedValue({
      id: 10,
      missingPair: null,
    } as any);

    const seated = seatsForTables(3).filter((s) => s !== "3EW");

    const result = await resolveStart({ source: "SPEC", specId: 10 }, seated);

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBe("3EW");
    // One sit-out per round.
    for (let r = 0; r < 3; r++) {
      const sitOuts = result.movement!.filter((t) => !playsBoards(t.rounds[r]))
        .length;
      expect(sitOuts).toBe(1);
    }
  });
});
