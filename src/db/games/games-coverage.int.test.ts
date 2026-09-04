// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { TimerState } from "@/timer/timer-state";

/**
 * Coverage for the per-game database entry points that the other games int
 * tests don't touch:
 *  - createGameDb (create + migrate + seed default section, and the
 *    "already exists" guard)
 *  - updateTimerState / findTimerState round-trip and their "db does not
 *    exist" guards
 *  - the `if (!db) throw` guard on every action/query that resolves getDb,
 *    reached by calling with a gameId whose db was never created.
 */
describe("games db: coverage gaps", () => {
  let harness: DbHarness;
  // A gameId that never gets a db file, so getDb(missing) returns null and the
  // `if (!db) throw` guard fires.
  const missingGameId = "no-such-game";

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  function timerState(): TimerState {
    return {
      version: 1,
      phase: "play",
      board: 1,
      round: 1,
      boardsPerRound: 2,
      totalRounds: 8,
      playDuration: 420,
      moveDuration: 60,
      isRunning: true,
      phaseStartedAt: 1000,
      remainingMs: 5000,
    };
  }

  describe("createGameDb", () => {
    it("creates and migrates a new per-game db seeded with section A", async () => {
      const { createGameDb } = await import("@/db/games/actions/create-game");
      const { findSections } = await import("@/db/games/queries/find-sections");
      const games = await import("@/db/games");

      const newGameId = `game-${Math.random().toString(16).slice(2)}`;
      await createGameDb(newGameId, 5);

      const db = await games.getDb(newGameId);
      expect(db).toBeTruthy();

      const sections = await findSections(db!);
      expect(sections).toHaveLength(1);
      expect(sections[0]).toMatchObject({ section: "A", label: "A", tables: 5 });
    });

    it("rejects creating a db that already exists", async () => {
      const { createGameDb } = await import("@/db/games/actions/create-game");

      // The harness already built a db at harness.gameId.
      await expect(createGameDb(harness.gameId)).rejects.toThrow(
        /already exists/,
      );
    });
  });

  describe("timer state", () => {
    it("inserts then updates and reads back the timer state", async () => {
      const { updateTimerState } = await import(
        "@/db/games/actions/update-timer-state"
      );
      const { findTimerState } = await import(
        "@/db/games/queries/find-timer-state"
      );

      // No timer row yet.
      expect(await findTimerState(harness.gameId)).toBeNull();

      const state = timerState();
      await updateTimerState(harness.gameId, state);
      expect(await findTimerState(harness.gameId)).toEqual(state);

      // Upsert overwrites the existing row.
      const updated = { ...state, round: 3, board: 5 };
      await updateTimerState(harness.gameId, updated);
      expect(await findTimerState(harness.gameId)).toEqual(updated);
    });

    it("updateTimerState throws when the game db does not exist", async () => {
      const { updateTimerState } = await import(
        "@/db/games/actions/update-timer-state"
      );
      await expect(
        updateTimerState(missingGameId, timerState()),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("findTimerState throws when the game db does not exist", async () => {
      const { findTimerState } = await import(
        "@/db/games/queries/find-timer-state"
      );
      await expect(findTimerState(missingGameId)).rejects.toThrow(
        /Game db does not exist/,
      );
    });
  });

  describe("`if (!db) throw` guards on actions and queries", () => {
    it("createAssignment throws for a missing game db", async () => {
      const { createAssignment } = await import(
        "@/db/games/actions/create-assignment"
      );
      await expect(
        createAssignment(missingGameId, {
          seat: "A1N",
          playerId: 1,
        } as never),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("createBoard throws for a missing game db", async () => {
      const { createBoard } = await import("@/db/games/actions/create-board");
      await expect(
        createBoard(missingGameId, {
          section: "A",
          roundNumber: 1,
          tableNumber: 1,
          boardNumber: 1,
          ns: "1",
          ew: "2",
        } as never),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("createParticipant throws for a missing game db", async () => {
      const { createParticipant } = await import(
        "@/db/games/actions/create-participant"
      );
      await expect(
        createParticipant(missingGameId, {
          initialSeat: "A1NS",
          player1: 1,
          player2: 2,
          secretKey: "k",
        } as never),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("createPlayer throws for a missing game db", async () => {
      const { createPlayer } = await import("@/db/games/actions/create-player");
      await expect(
        createPlayer(missingGameId, { firstName: "A", lastName: "B" }),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("createBoardSubmission throws for a missing game db", async () => {
      const { createBoardSubmission } = await import(
        "@/db/games/actions/create-submission"
      );
      await expect(
        createBoardSubmission(missingGameId, {
          section: "A",
          roundNumber: 1,
          tableNumber: 1,
          boardNumber: 1,
          side: "NS",
        } as never),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("createSection throws for a missing game db", async () => {
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      await expect(
        createSection(missingGameId, { section: "Z", tables: 4 }),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("deleteParticipant throws for a missing game db", async () => {
      const { deleteParticipant } = await import(
        "@/db/games/actions/delete-participant"
      );
      await expect(
        deleteParticipant(missingGameId, "A1NS" as never),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("deleteSection throws for a missing game db", async () => {
      const { deleteSection } = await import(
        "@/db/games/actions/delete-section"
      );
      await expect(deleteSection(missingGameId, "A")).rejects.toThrow(
        /Game db does not exist/,
      );
    });

    it("deleteBoardSubmissions throws for a missing game db", async () => {
      const { deleteBoardSubmissions } = await import(
        "@/db/games/actions/delete-submissions"
      );
      await expect(
        deleteBoardSubmissions(missingGameId, "A", 1, 1),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("renameSection throws for a missing game db", async () => {
      const { renameSection } = await import(
        "@/db/games/actions/rename-section"
      );
      await expect(
        renameSection(missingGameId, "A", "Red"),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("setSectionMovement throws for a missing game db", async () => {
      const { setSectionMovement } = await import(
        "@/db/games/actions/set-section-movement"
      );
      await expect(
        setSectionMovement(missingGameId, "A", null),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("updateSectionTables throws for a missing game db", async () => {
      const { updateSectionTables } = await import(
        "@/db/games/actions/update-section-tables"
      );
      await expect(
        updateSectionTables(missingGameId, "A", 4),
      ).rejects.toThrow(/Game db does not exist/);
    });

    it("findPairForPlayerId throws for a missing game db", async () => {
      const { findPairForPlayerId } = await import(
        "@/db/games/queries/find-pair-for-player-id"
      );
      await expect(findPairForPlayerId(missingGameId, 1)).rejects.toThrow(
        /Game db does not exist/,
      );
    });

    it("findBoardSubmissions throws for a missing game db", async () => {
      const { findBoardSubmissions } = await import(
        "@/db/games/queries/find-submissions"
      );
      await expect(
        findBoardSubmissions(missingGameId, "A", 1, 1),
      ).rejects.toThrow(/Game db does not exist/);
    });
  });

  describe("`section does not exist` guards", () => {
    // These operate on a real (harness-provisioned) game db but reference a
    // section letter that was never created, exercising the second guard.
    it("renameSection throws when the section is unknown", async () => {
      const { renameSection } = await import(
        "@/db/games/actions/rename-section"
      );
      await expect(
        renameSection(harness.gameId, "Z", "Red"),
      ).rejects.toThrow(/Section Z does not exist/);
    });

    it("deleteSection throws when the section is unknown", async () => {
      const { deleteSection } = await import(
        "@/db/games/actions/delete-section"
      );
      await expect(deleteSection(harness.gameId, "Z")).rejects.toThrow(
        /Section Z does not exist/,
      );
    });

    it("setSectionMovement throws when the section is unknown", async () => {
      const { setSectionMovement } = await import(
        "@/db/games/actions/set-section-movement"
      );
      await expect(
        setSectionMovement(harness.gameId, "Z", null),
      ).rejects.toThrow(/Section Z does not exist/);
    });

    it("updateSectionTables throws when the section is unknown", async () => {
      const { updateSectionTables } = await import(
        "@/db/games/actions/update-section-tables"
      );
      await expect(
        updateSectionTables(harness.gameId, "Z", 4),
      ).rejects.toThrow(/Section Z does not exist/);
    });

    it("setSectionMovement serialises a non-null movement onto the section", async () => {
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      const { setSectionMovement } = await import(
        "@/db/games/actions/set-section-movement"
      );
      const { getSectionMovement } = await import(
        "@/db/games/queries/get-section-movement"
      );
      const games = await import("@/db/games");

      await createSection(harness.gameId, { section: "A", tables: 8 });
      await setSectionMovement(harness.gameId, "A", {
        source: "MITCHELL",
        mitchell: { tables: 8, rounds: 8, boardsPerRound: 2 },
      });

      const db = await games.getDb(harness.gameId);
      expect(await getSectionMovement(db!, "A")).toEqual({
        source: "MITCHELL",
        mitchell: { tables: 8, rounds: 8, boardsPerRound: 2 },
      });

      // Clearing with null exercises the `selected === null ? null : ...`
      // branch on an existing section.
      await setSectionMovement(harness.gameId, "A", null);
      expect(await getSectionMovement(db!, "A")).toBeNull();
    });
  });
});
