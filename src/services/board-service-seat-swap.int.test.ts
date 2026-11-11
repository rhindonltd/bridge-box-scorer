// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { and, eq } from "drizzle-orm";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { makeBoard, seedFixtureMatch } from "@/mocks/fixtures/db-rows";
import type { BoardOutcome } from "@/model/score";
import { computeImps, outcomeToScore } from "@/scoring/traveller/common";

// Board 1 scores for the open (table 1) and closed (table 2) rooms.
const OPEN = () => outcomeToScore(1, "4HN=" as BoardOutcome)!;
const CLOSED = () => outcomeToScore(1, "3NTN=" as BoardOutcome)!;

/**
 * Travellers for boards a director marked "played the wrong way round": the
 * result is unchanged but is credited to the opposite pairs, so the traveller
 * shows the ns/ew pair ids exchanged (pairs) and the teams margin is taken
 * from the teams' actual seats.
 */
describe("board-service — played-reversed boards", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });
  afterEach(() => {
    harness.teardown();
  });

  describe("getBoardInstances (pairs)", () => {
    async function seed(seatsSwapped: boolean) {
      const db = (await harness.getDb()) as Db;
      seedFixtureMatch(db);
      const { createBoard } = await import("@/db/games/actions/create-board");
      await createBoard(
        harness.gameId,
        makeBoard({
          boardNumber: 1,
          ns: "A1NS",
          ew: "A2EW",
          status: "CONFIRMED",
          confirmedResult: "3NTN=" as BoardOutcome,
          seatsSwapped,
        }),
      );
      return db;
    }

    it("shows the ns/ew pair ids exchanged and keeps the result", async () => {
      const db = await seed(true);
      const { getBoardInstances } = await import("@/services/board-service");

      const [row] = await getBoardInstances(db, 1);

      expect(row.participants.ns).toBe("A2EW");
      expect(row.participants.ew).toBe("A1NS");
      expect(row.currentResult).toBe("3NTN=");
      expect(row.status).toBe("CONFIRMED");
      expect(row.seatsSwapped).toBe(true);
    });

    it("leaves an unflagged board as recorded", async () => {
      const db = await seed(false);
      const { getBoardInstances } = await import("@/services/board-service");

      const [row] = await getBoardInstances(db, 1);

      expect(row.participants.ns).toBe("A1NS");
      expect(row.participants.ew).toBe("A2EW");
      expect(row.seatsSwapped).toBe(false);
    });

    it("restores the original attribution once the flag is cleared", async () => {
      const db = await seed(true);
      const { setBoardSeatsSwapped } = await import(
        "@/db/games/actions/set-board-result"
      );
      const { getBoardInstances } = await import("@/services/board-service");

      await setBoardSeatsSwapped(
        db,
        { roundNumber: 1, tableNumber: 1, boardNumber: 1 },
        false,
      );
      const [row] = await getBoardInstances(db, 1);

      expect(row.participants.ns).toBe("A1NS");
      expect(row.participants.ew).toBe("A2EW");
    });
  });

  describe("buildTeamTravellerMatches (teams margin)", () => {
    /** Materialise teams 1 v 2 (1 board) with open 4H= / closed 3NT=. */
    async function seedTeams() {
      const db = (await harness.getDb()) as Db;
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      const { materializeSwissTeamsRound } = await import(
        "@/services/materialize-swiss-teams-round"
      );
      const { boards } = await import("@/db/games/tables/boards");

      await createSection(harness.gameId, { section: "A", tables: 2 });
      await materializeSwissTeamsRound(
        harness.gameId,
        "A",
        1,
        1,
        5,
        [{ a: 1, b: 2 }],
        null,
        null,
      );
      for (const [tableNumber, result] of [
        [1, "4HN="],
        [2, "3NTN="],
      ] as const) {
        await db
          .update(boards)
          .set({ confirmedResult: result as never, status: "CONFIRMED" })
          .where(
            and(eq(boards.tableNumber, tableNumber), eq(boards.boardNumber, 1)),
          );
      }
      return db;
    }

    async function swapTable(db: Db, tableNumber: number) {
      const { setBoardSeatsSwapped } = await import(
        "@/db/games/actions/set-board-result"
      );
      await setBoardSeatsSwapped(
        db,
        { roundNumber: 1, tableNumber, boardNumber: 1 },
        true,
      );
    }

    async function margin(db: Db) {
      const { buildTeamTravellerMatches } = await import(
        "@/services/board-service"
      );
      return (await buildTeamTravellerMatches(db, 1))[0].margin;
    }

    it("is unchanged when no room is flagged", async () => {
      const db = await seedTeams();
      expect(await margin(db)).toBe(computeImps(OPEN() - CLOSED()));
    });

    it("credits the home team the EW side of the open room when it is flagged", async () => {
      const db = await seedTeams();
      await swapTable(db, 1);
      // Home held EW in the open room and EW in the closed room.
      expect(await margin(db)).toBe(computeImps(-OPEN() - CLOSED()));
    });

    it("credits the home team the NS side of the closed room when it is flagged", async () => {
      const db = await seedTeams();
      await swapTable(db, 2);
      // Home NS in the open room; the opponent was EW in the closed room.
      expect(await margin(db)).toBe(computeImps(OPEN() + CLOSED()));
    });

    it("returns to the original margin when the flag is cleared", async () => {
      const db = await seedTeams();
      await swapTable(db, 1);
      const { setBoardSeatsSwapped } = await import(
        "@/db/games/actions/set-board-result"
      );
      await setBoardSeatsSwapped(
        db,
        { roundNumber: 1, tableNumber: 1, boardNumber: 1 },
        false,
      );
      expect(await margin(db)).toBe(computeImps(OPEN() - CLOSED()));
    });
  });
});
