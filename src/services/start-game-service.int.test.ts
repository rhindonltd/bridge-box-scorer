import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- mock the DB + query/materialization layer ----

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/tables/boards", () => ({
  boards: "boards",
}));

vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/game-index/queries/get-selected-movement", () => ({
  getSelectedMovement: vi.fn(),
}));

vi.mock("@/services/materialize-movement", () => ({
  materializePairLikeMovement: vi.fn(async () => {}),
}));

import { getDb } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { getSelectedMovement } from "@/db/game-index/queries/get-selected-movement";
import { materializePairLikeMovement } from "@/services/materialize-movement";
import { startGame } from "./start-game-service";
import { PairSeat } from "@/model/participants";

function seatedPairs(tables: number, exclude: PairSeat[] = []) {
  const pairs: { initialSeat: PairSeat }[] = [];
  for (let t = 1; t <= tables; t++) {
    for (const dir of ["NS", "EW"] as const) {
      const seat = `${t}${dir}` as PairSeat;
      if (!exclude.includes(seat)) {
        pairs.push({ initialSeat: seat });
      }
    }
  }
  return pairs;
}

/** Mock a games Db whose boards table is empty (not yet started). */
function mockEmptyDb() {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ limit: vi.fn(async () => []) })),
    })),
  };
}

/** Mock a games Db whose boards table already has rows (started). */
function mockStartedDb() {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({ limit: vi.fn(async () => [{ n: 1 }]) })),
    })),
  };
}

const mitchell5 = {
  source: "MITCHELL" as const,
  mitchell: { tables: 5, rounds: 5, boardsPerRound: 3 },
};

describe("checkStart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports canStart false with NO_MOVEMENT_SELECTED when nothing selected", async () => {
    vi.mocked(getSelectedMovement).mockResolvedValue(null);
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(5) as any);

    const { checkStart } = await import("./start-game-service");
    const result = await checkStart("g1", {} as any);

    expect(result.canStart).toBe(false);
    expect(result.problems.map((p) => p.code)).toContain(
      "NO_MOVEMENT_SELECTED",
    );
  });

  it("reports canStart true for a valid full house", async () => {
    vi.mocked(getSelectedMovement).mockResolvedValue(mitchell5);
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(5) as any);

    const { checkStart } = await import("./start-game-service");
    const result = await checkStart("g1", {} as any);

    expect(result.canStart).toBe(true);
  });

  it("reports canStart true and a sit-out seat when one pair short", async () => {
    vi.mocked(getSelectedMovement).mockResolvedValue(mitchell5);
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(5, ["3EW"]) as any);

    const { checkStart } = await import("./start-game-service");
    const result = await checkStart("g1", {} as any);

    expect(result.canStart).toBe(true);
    expect(result.sitOutSeat).toBe("3EW");
  });

  it("does not write anything (read-only)", async () => {
    vi.mocked(getSelectedMovement).mockResolvedValue(mitchell5);
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(5) as any);

    const { checkStart } = await import("./start-game-service");
    await checkStart("g1", {} as any);

    expect(materializePairLikeMovement).not.toHaveBeenCalled();
  });
});

describe("startGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("materializes when the game is valid", async () => {
    vi.mocked(getDb).mockResolvedValue(mockEmptyDb() as any);
    vi.mocked(getSelectedMovement).mockResolvedValue(mitchell5);
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(5) as any);

    const result = await startGame("g1");

    expect(result.canStart).toBe(true);
    expect(materializePairLikeMovement).toHaveBeenCalledTimes(1);
  });

  it("does not materialize when seating is invalid", async () => {
    vi.mocked(getDb).mockResolvedValue(mockEmptyDb() as any);
    vi.mocked(getSelectedMovement).mockResolvedValue(mitchell5);
    // Two pairs short.
    vi.mocked(findPairs).mockResolvedValue(
      seatedPairs(5, ["4NS", "5NS"]) as any,
    );

    const result = await startGame("g1");

    expect(result.canStart).toBe(false);
    expect(materializePairLikeMovement).not.toHaveBeenCalled();
  });

  it("does not materialize when the game was already started", async () => {
    vi.mocked(getDb).mockResolvedValue(mockStartedDb() as any);
    vi.mocked(getSelectedMovement).mockResolvedValue(mitchell5);
    vi.mocked(findPairs).mockResolvedValue(seatedPairs(5) as any);

    const result = await startGame("g1");

    expect(result.canStart).toBe(false);
    expect(materializePairLikeMovement).not.toHaveBeenCalled();
  });
});
