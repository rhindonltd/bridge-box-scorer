// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { matches } from "@/db/games/tables/matches";
import { boards } from "@/db/games/tables/boards";
import { makeBoard } from "@/mocks/fixtures/db-rows";
import type { BoardOutcome } from "@/model/score";
import * as actions from "@/db/games/actions/set-board-result";
/**
 * Integration coverage for the board-result / match-ruling writers, against a
 * real migrated per-game database.
 */
describe("set-board-result", () => {
  let harness: DbHarness;
  let db: Db;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    db = (await harness.getDb()) as Db;
  });
  afterEach(() => {
    harness.teardown();
  });
  function seedMatch(
    id: number,
    home: string,
    opponent: string,
    ruling: string | null = null,
  ) {
    db.insert(matches)
      .values({
        id,
        section: "A",
        roundNumber: 1,
        kind: "TEAMS",
        scoredAsUnit: true,
        home,
        opponent,
        boardStart: 1,
        boardEnd: 2,
        ruling,
      })
      .run();
  }
  function seedBoard(over: Parameters<typeof makeBoard>[0] = {}) {
    db.insert(boards).values(makeBoard(over)).run();
  }
  function board(tableNumber = 1, boardNumber = 1) {
    return db
      .select()
      .from(boards)
      .where(eq(boards.tableNumber, tableNumber))
      .all()
      .find((b) => b.boardNumber === boardNumber)!;
  }
  function ruling(id: number) {
    return db.select().from(matches).where(eq(matches.id, id)).get()!.ruling;
  }
  const key = { section: "A", roundNumber: 1, tableNumber: 1, boardNumber: 1 };
  describe("per-board writers", () => {
    beforeEach(() => {
      seedMatch(1, "A1NS", "A2NS");
      seedBoard();
    });
    it("confirmBoardResult sets the confirmed result", async () => {
      await actions.confirmBoardResult(db, key, "3NTN=" as BoardOutcome);
      expect(board()).toMatchObject({
        confirmedResult: "3NTN=",
        status: "CONFIRMED",
      });
    });
    it("overrideBoardResult sets the override", async () => {
      await actions.overrideBoardResult(db, key, "4SN=" as BoardOutcome);
      expect(board()).toMatchObject({
        directorOverrideResult: "4SN=",
        status: "OVERRIDDEN",
      });
    });
    it("cancelBoardResult marks the board cancelled", async () => {
      await actions.cancelBoardResult(db, key, "A60/40" as BoardOutcome);
      expect(board()).toMatchObject({
        directorOverrideResult: "A60/40",
        status: "CANCELLED",
      });
    });
    it("removeTeamsBoardResult marks the board removed", async () => {
      await actions.removeTeamsBoardResult(db, key, "TRM:NS");
      expect(board()).toMatchObject({
        directorOverrideResult: "TRM:NS",
        status: "REMOVED_TEAMS",
      });
    });
    it("addresses a board without a section when none is given", async () => {
      await actions.confirmBoardResult(
        db,
        { roundNumber: 1, tableNumber: 1, boardNumber: 1 },
        "3NTN=" as BoardOutcome,
      );
      expect(board().status).toBe("CONFIRMED");
    });
  });
  describe("match-level rulings", () => {
    beforeEach(() => {
      // Match 1: home table 1 vs table 2; match 2 sits on tables 3/4.
      seedMatch(1, "A1NS", "A2NS");
      seedBoard({ tableNumber: 1, boardNumber: 1, matchId: 1 });
      seedBoard({
        tableNumber: 2,
        boardNumber: 1,
        ns: "A2NS",
        ew: "A2EW",
        matchId: 1,
      });
    });
    const room1 = { section: "A", roundNumber: 1, tableNumber: 1 };
    const room2 = { section: "A", roundNumber: 1, tableNumber: 2 };
    it("voidTeamsMatch stores the cause as-is from the home room", async () => {
      await actions.voidTeamsMatch(db, room1, "VOID:SHORT_OFFENDER_NS");
      expect(ruling(1)).toBe("VOID:SHORT_OFFENDER_NS");
    });
    it("voidTeamsMatch inverts the offender side from the opponent room", async () => {
      await actions.voidTeamsMatch(db, room2, "VOID:SHORT_OFFENDER_NS");
      expect(ruling(1)).toBe("VOID:SHORT_OFFENDER_EW");
      await actions.voidTeamsMatch(db, room2, "VOID:SHORT_OFFENDER_EW");
      expect(ruling(1)).toBe("VOID:SHORT_OFFENDER_NS");
      await actions.voidTeamsMatch(db, room2, "VOID:OTHER");
      expect(ruling(1)).toBe("VOID:OTHER");
    });
    it("voidTeamsMatch narrows by board number when supplied", async () => {
      await actions.voidTeamsMatch(db, { ...room1, boardNumber: 1 }, "VOID:X");
      expect(ruling(1)).toBe("VOID:X");
    });
    it("voidTeamsMatch / voidPairsMatch / markMismatch ignore an unknown room", async () => {
      const nowhere = { section: "Z", roundNumber: 9, tableNumber: 9 };
      await actions.voidTeamsMatch(db, nowhere, "VOID:X");
      await actions.voidPairsMatch(db, nowhere, "VOIDP:X");
      await actions.markMismatch(db, nowhere, "MM:NS:HIGHER:NOT");
      expect(ruling(1)).toBeNull();
    });
    it("voidPairsMatch writes the token unchanged", async () => {
      await actions.voidPairsMatch(db, room2, "VOIDP:AVE");
      expect(ruling(1)).toBe("VOIDP:AVE");
    });
    it("markMismatch stores the home-relative ruling, flipping the side from the opponent room", async () => {
      await actions.markMismatch(db, room1, "MM:NS:HIGHER:NOT");
      expect(ruling(1)).toBe("MM:NS:HIGHER:NOT");
      // Opponent room's NS is the home match's EW; the other side is kept.
      await actions.markMismatch(db, room2, "MM:NS:LOWER:OWN");
      expect(ruling(1)).toBe("MM:NS:HIGHER:NOT;MM:EW:LOWER:OWN");
      // Flipping EW from the opponent room lands on NS, replacing it.
      await actions.markMismatch(db, room2, "MM:EW:LOWER:NOT");
      expect(ruling(1)).toBe("MM:NS:LOWER:NOT;MM:EW:LOWER:OWN");
    });
    it("markMismatch rejects a token that is not a mismatch ruling", async () => {
      await expect(
        actions.markMismatch(db, room1, "VOID:X"),
      ).rejects.toThrow("Not a mismatch ruling: VOID:X");
      // Wrong shape is passed through the inverter untouched, then rejected.
      await expect(
        actions.markMismatch(db, room2, "MM:NS"),
      ).rejects.toThrow("Not a mismatch ruling: MM:NS");
      await expect(
        actions.markMismatch(db, room2, "XX:NS:HIGHER:NOT"),
      ).rejects.toThrow("Not a mismatch ruling");
    });
    it("treats the acted room as home when the match home is not a seat id", async () => {
      db.update(matches).set({ home: "garbage" }).where(eq(matches.id, 1)).run();
      // Even from the opponent room, nothing is inverted.
      await actions.voidTeamsMatch(db, room2, "VOID:SHORT_OFFENDER_NS");
      expect(ruling(1)).toBe("VOID:SHORT_OFFENDER_NS");
    });
    it("ignores a board whose match row cannot be found", async () => {
      // A structural db whose boards lookup finds a row but matches finds none
      // (impossible under the foreign key on a real database).
      let call = 0;
      const fake = {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => (call++ === 0 ? [{ matchId: 99 }] : []),
            }),
          }),
        }),
        update: () => {
          throw new Error("should not write");
        },
      };
      await actions.voidTeamsMatch(fake as never, room1, "VOID:X");
      expect(call).toBe(2);
    });
  });
});
