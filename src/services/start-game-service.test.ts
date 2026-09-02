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
import { resolveSectionStart } from "./start-game-service";
import { PairSeat } from "@/model/participants";

function seatsForTables(tables: number, section = "A"): PairSeat[] {
  const seats: PairSeat[] = [];
  for (let t = 1; t <= tables; t++) {
    seats.push(`${section}${t}NS`, `${section}${t}EW`);
  }
  return seats;
}

function isSitOut(round: { sitOut?: boolean }): boolean {
  return round.sitOut === true;
}

describe("resolveSectionStart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NO_MOVEMENT_SELECTED when nothing is selected", async () => {
    const result = await resolveSectionStart("A", null, ["A1NS", "A1EW"]);
    expect(result.validation.canStart).toBe(false);
    expect(result.movement).toBeNull();
    expect(result.validation.problems.map((p) => p.code)).toContain(
      "NO_MOVEMENT_SELECTED",
    );
  });

  it("resolves a fully-seated Mitchell without a sit-out", async () => {
    const result = await resolveSectionStart(
      "A",
      { source: "MITCHELL", mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 } },
      seatsForTables(5),
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBeNull();
    expect(result.movement).not.toBeNull();
    const anySitOut = result.movement!.some((t) => t.rounds.some(isSitOut));
    expect(anySitOut).toBe(false);
  });

  it("resolves a one-short Mitchell with a sit-out applied", async () => {
    const seated = seatsForTables(5).filter((s) => s !== "A3EW");

    const result = await resolveSectionStart(
      "A",
      { source: "MITCHELL", mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 } },
      seated,
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBe("A3EW");
    // Exactly one sit-out per round => 5 flagged rounds total.
    const sitOutTotal = result
      .movement!.flatMap((t) => t.rounds)
      .filter(isSitOut).length;
    expect(sitOutTotal).toBe(5);
  });

  it("resolves a non-A section with a sit-out qualified to that section", async () => {
    const seated = seatsForTables(5, "B").filter((s) => s !== "B3EW");

    const result = await resolveSectionStart(
      "B",
      { source: "MITCHELL", mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 } },
      seated,
    );

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBe("B3EW");
  });

  it("rejects a Mitchell that is two pairs short", async () => {
    const seated = seatsForTables(5).filter(
      (s) => s !== "A4NS" && s !== "A4EW" && s !== "A5NS",
    );

    const result = await resolveSectionStart(
      "A",
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

    const seated = seatsForTables(3).filter((s) => s !== "A3EW");

    const result = await resolveSectionStart("A", { source: "SPEC", specId: 10 }, seated);

    expect(result.validation.canStart).toBe(true);
    expect(result.validation.sitOutSeat).toBe("A3EW");
    for (let r = 0; r < 3; r++) {
      const sitOuts = result.movement!.filter((t) => isSitOut(t.rounds[r]))
        .length;
      expect(sitOuts).toBe(1);
    }
  });
});
