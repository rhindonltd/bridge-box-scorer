import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => {
  const getDb = vi.fn();
  return {
    getDb,
    requireGameDb: vi.fn(async (gameId: string) => {
      const db = await getDb(gameId);
      if (!db) throw new Error("Game db does not exist");
      return db;
    }),
  };
});

import { getDb } from "@/db/games";
import {
  timerKey,
  findTimerState,
  findAllTimerStates,
} from "./find-timer-state";

/** A db whose `select().from().where()` resolves to `rows`. */
function stubDb(rows: unknown[]) {
  const where = vi.fn(() => Promise.resolve(rows));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { select } as never;
}

const timer = (n: number) => ({ phase: "PLAY", round: n }) as const;

describe("timerKey", () => {
  it("namespaces the section under the timer prefix", () => {
    expect(timerKey("A")).toBe("timer:A");
  });
});

describe("findTimerState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    await expect(findTimerState("g1", "A")).rejects.toThrow(
      "Game db does not exist",
    );
  });

  it("parses and returns the single matching row's timer state", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([{ key: "timer:A", value: JSON.stringify(timer(1)) }]),
    );
    await expect(findTimerState("g1", "A")).resolves.toEqual(timer(1));
  });

  it("returns null when no timer row exists for the section", async () => {
    vi.mocked(getDb).mockResolvedValue(stubDb([]));
    await expect(findTimerState("g1", "A")).resolves.toBeNull();
  });
});

describe("findAllTimerStates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when the game db does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    await expect(findAllTimerStates("g1")).rejects.toThrow(
      "Game db does not exist",
    );
  });

  it("keys each section's parsed timer state by its section letter", async () => {
    vi.mocked(getDb).mockResolvedValue(
      stubDb([
        { key: "timer:A", value: JSON.stringify(timer(1)) },
        { key: "timer:B", value: JSON.stringify(timer(2)) },
      ]),
    );

    const result = await findAllTimerStates("g1");
    expect(result.get("A")).toEqual(timer(1));
    expect(result.get("B")).toEqual(timer(2));
    expect(result.size).toBe(2);
  });
});
