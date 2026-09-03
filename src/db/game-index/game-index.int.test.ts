// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { NewBridgeGame } from "@/db/game-index/schema";

function newGame(overrides: Partial<NewBridgeGame> = {}): NewBridgeGame {
  return {
    gameId: `g-${Math.random().toString(16).slice(2)}`,
    eventName: "Monday Pairs",
    director: "Jacqui",
    gameType: "PAIRS",
    scoringType: "MP",
    sessionName: "1",
    sectionName: "A",
    eventDate: new Date().toISOString(),
    tables: 8,
    ...overrides,
  };
}

/**
 * Integration coverage for the game-index database: createBridgeGame,
 * findGameById, findAllGames, updateTableCount, and the selected-movement
 * round-trip — against a real migrated game-index.db.
 */
describe("game-index db", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("game-index");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("creates a game and returns the inserted row", async () => {
    const { createBridgeGame } = await import(
      "@/db/game-index/actions/create-game"
    );

    const created = await createBridgeGame(newGame({ gameId: "abc123" }));
    expect(created).toMatchObject({
      gameId: "abc123",
      eventName: "Monday Pairs",
      gameType: "PAIRS",
      tables: 8,
    });
  });

  it("finds a game by id and returns null for a missing id", async () => {
    const { createBridgeGame } = await import(
      "@/db/game-index/actions/create-game"
    );
    const { findGameById } = await import(
      "@/db/game-index/queries/find-game-by-id"
    );

    await createBridgeGame(newGame({ gameId: "find-me" }));

    expect((await findGameById("find-me"))?.gameId).toBe("find-me");
    expect(await findGameById("nope")).toBeNull();
  });

  it("lists all games newest-first", async () => {
    const { createBridgeGame } = await import(
      "@/db/game-index/actions/create-game"
    );
    const { findAllGames } = await import(
      "@/db/game-index/queries/find-all-games"
    );

    await createBridgeGame(
      newGame({ gameId: "older", createdAt: "2024-01-01 00:00:00" }),
    );
    await createBridgeGame(
      newGame({ gameId: "newer", createdAt: "2024-06-01 00:00:00" }),
    );

    const all = await findAllGames();
    expect(all.map((g) => g.gameId)).toEqual(["newer", "older"]);
  });

  it("updates the table count for a game", async () => {
    const { createBridgeGame } = await import(
      "@/db/game-index/actions/create-game"
    );
    const { updateTableCount } = await import(
      "@/db/game-index/actions/update-table-count"
    );
    const { findGameById } = await import(
      "@/db/game-index/queries/find-game-by-id"
    );

    await createBridgeGame(newGame({ gameId: "resize", tables: 8 }));
    await updateTableCount("resize", 12);

    expect((await findGameById("resize"))?.tables).toBe(12);
  });

  it("round-trips the selected movement (null before, typed value after)", async () => {
    const { createBridgeGame } = await import(
      "@/db/game-index/actions/create-game"
    );
    const { setSelectedMovement } = await import(
      "@/db/game-index/actions/set-selected-movement"
    );
    const { getSelectedMovement } = await import(
      "@/db/game-index/queries/get-selected-movement"
    );

    await createBridgeGame(newGame({ gameId: "mv" }));
    expect(await getSelectedMovement("mv")).toBeNull();

    await setSelectedMovement("mv", {
      source: "MITCHELL",
      mitchell: { tables: 8, rounds: 8, boardsPerRound: 2 },
    });

    expect(await getSelectedMovement("mv")).toEqual({
      source: "MITCHELL",
      mitchell: { tables: 8, rounds: 8, boardsPerRound: 2 },
    });
  });

  it("returns null selected movement for an unknown game", async () => {
    const { getSelectedMovement } = await import(
      "@/db/game-index/queries/get-selected-movement"
    );
    expect(await getSelectedMovement("ghost")).toBeNull();
  });

  it("includes only games dated today or later in joinable games", async () => {
    const { createBridgeGame } = await import(
      "@/db/game-index/actions/create-game"
    );
    const { findJoinableGames } = await import(
      "@/db/game-index/queries/find-joinable-games"
    );

    const dateOnly = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    await createBridgeGame(
      newGame({ gameId: "today", eventDate: dateOnly(today) }),
    );
    await createBridgeGame(
      newGame({ gameId: "future", eventDate: dateOnly(tomorrow) }),
    );
    await createBridgeGame(
      newGame({ gameId: "yesterday", eventDate: dateOnly(yesterday) }),
    );
    await createBridgeGame(
      newGame({ gameId: "past", eventDate: lastYear.toISOString() }),
    );

    const joinable = await findJoinableGames();
    const ids = joinable.map((g) => g.gameId);
    expect(ids).toContain("today");
    expect(ids).toContain("future");
    expect(ids).not.toContain("yesterday");
    expect(ids).not.toContain("past");
  });
});
