// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
/**
 * Integration coverage for the small game-index actions/queries: combined
 * ranking, tournament level, event-detail updates (incl. the undefined-current
 * guard) and isTeamsGame, against a real migrated game-index database.
 */
describe("game-index actions and queries", () => {
  let harness: DbHarness;
  beforeEach(async () => {
    harness = createDbHarness("game-index");
    await harness.setup();
  });
  afterEach(() => {
    harness.teardown();
  });
  async function seedGame(overrides: Record<string, unknown> = {}) {
    const { createBridgeGame } = await import(
      "@/db/game-index/actions/create-game"
    );
    return createBridgeGame({
      eventName: "Monday",
      gameType: "PAIRS",
      sectionName: "A",
      eventDate: "2025-01-01",
      tables: 4,
      selectedMovement: '{"source":"MITCHELL"}',
      ...overrides,
    } as never);
  }
  async function reload(gameId: string) {
    const { findGameById } = await import(
      "@/db/game-index/queries/find-game-by-id"
    );
    return findGameById(gameId);
  }
  it("updateCombinedRanking toggles the flag", async () => {
    const { updateCombinedRanking } = await import(
      "@/db/game-index/actions/update-combined-ranking"
    );
    const g = await seedGame();
    await updateCombinedRanking(g.gameId, true);
    expect((await reload(g.gameId))?.combinedRanking).toBe(true);
    await updateCombinedRanking(g.gameId, false);
    expect((await reload(g.gameId))?.combinedRanking).toBe(false);
  });
  it("updateTournamentLevel persists the level", async () => {
    const { updateTournamentLevel } = await import(
      "@/db/game-index/actions/update-tournament-level"
    );
    const { TournamentLevels } = await import(
      "@/db/games/types/tournament-level"
    );
    const g = await seedGame();
    const level = TournamentLevels[TournamentLevels.length - 1];
    await updateTournamentLevel(g.gameId, level);
    expect((await reload(g.gameId))?.tournamentLevel).toBe(level);
  });
  it("isTeamsGame is true only for TEAMS games and false for unknown ids", async () => {
    const { isTeamsGame } = await import(
      "@/db/game-index/queries/is-teams-game"
    );
    const pairs = await seedGame();
    const teams = await seedGame({ gameType: "TEAMS" });
    expect(await isTeamsGame(pairs.gameId)).toBe(false);
    expect(await isTeamsGame(teams.gameId)).toBe(true);
    expect(await isTeamsGame("missing")).toBe(false);
  });
  it("updateEventDetails writes every field and clears the movement on structural change", async () => {
    const { updateEventDetails } = await import(
      "@/db/game-index/actions/update-event-details"
    );
    const g = await seedGame();
    await updateEventDetails(g.gameId, {
      eventName: "Renamed",
      director: "Jo",
      gameType: "TEAMS",
      eventFormat: "SWISS",
      scoringType: "IMP",
      leadCardRequired: true,
      handEntryEnabled: true,
    });
    const after = await reload(g.gameId);
    expect(after).toMatchObject({
      eventName: "Renamed",
      director: "Jo",
      gameType: "TEAMS",
      eventFormat: "SWISS",
      scoringType: "IMP",
      leadCardRequired: true,
      handEntryEnabled: true,
      selectedMovement: null,
    });
  });
  it("updateEventDetails with an unknown game id is a no-op and does not throw", async () => {
    const { updateEventDetails } = await import(
      "@/db/game-index/actions/update-event-details"
    );
    await expect(
      updateEventDetails("missing", {
        gameType: "TEAMS",
        eventFormat: "SWISS",
        scoringType: "IMP",
      }),
    ).resolves.toBeUndefined();
  });
});
