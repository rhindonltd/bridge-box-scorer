// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { makeBoard, makeSubmission } from "@/mocks/fixtures/db-rows";
import type { NewBoardSubmission } from "@/db/games/tables/submissions";

/**
 * Integration coverage for the boards + board_submissions slice: createBoard,
 * createBoardSubmission (insert + upsert), findBoardSubmissions, and
 * deleteBoardSubmissions, against a real migrated per-game database.
 */
describe("games db: boards and submissions", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("creates a board row that is retrievable by its primary key", async () => {
    const { createBoard } = await import("@/db/games/actions/create-board");
    await createBoard(harness.gameId, makeBoard({ boardNumber: 7 }));

    const db = (await harness.getDb()) as Db;
    const { boards } = await import("@/db/games/tables/boards");
    const rows = db.select().from(boards).all();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      section: "A",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 7,
      copy: "A",
      status: "NOT_PLAYED",
    });
  });

  it("inserts a submission then finds it by section/table/round", async () => {
    const { createBoardSubmission } = await import(
      "@/db/games/actions/create-submission"
    );
    const { findBoardSubmissions } = await import(
      "@/db/games/queries/find-submissions"
    );

    await createBoardSubmission(harness.gameId, makeSubmission());

    const found = await findBoardSubmissions(harness.gameId, "A", 1, 1);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ side: "NS", result: "3NTN=" });
  });

  it("upserts a submission for the same (section, round, table, side)", async () => {
    const { createBoardSubmission } = await import(
      "@/db/games/actions/create-submission"
    );
    const { findBoardSubmissions } = await import(
      "@/db/games/queries/find-submissions"
    );

    await createBoardSubmission(harness.gameId, makeSubmission());
    // Same NS side / same table+round: should update, not duplicate.
    await createBoardSubmission(
      harness.gameId,
      makeSubmission({
        boardNumber: 2,
        result: "4SN=" as NewBoardSubmission["result"],
      }),
    );

    const found = await findBoardSubmissions(harness.gameId, "A", 1, 1);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ boardNumber: 2, result: "4SN=" });
  });

  it("keeps NS and EW submissions as separate rows", async () => {
    const { createBoardSubmission } = await import(
      "@/db/games/actions/create-submission"
    );
    const { findBoardSubmissions } = await import(
      "@/db/games/queries/find-submissions"
    );

    await createBoardSubmission(harness.gameId, makeSubmission({ side: "NS" }));
    await createBoardSubmission(harness.gameId, makeSubmission({ side: "EW" }));

    const found = await findBoardSubmissions(harness.gameId, "A", 1, 1);
    expect(found.map((s) => s.side).sort()).toEqual(["EW", "NS"]);
  });

  it("deletes all submissions for a (section, table, round)", async () => {
    const { createBoardSubmission } = await import(
      "@/db/games/actions/create-submission"
    );
    const { deleteBoardSubmissions } = await import(
      "@/db/games/actions/delete-submissions"
    );
    const { findBoardSubmissions } = await import(
      "@/db/games/queries/find-submissions"
    );

    await createBoardSubmission(harness.gameId, makeSubmission({ side: "NS" }));
    await createBoardSubmission(harness.gameId, makeSubmission({ side: "EW" }));

    await deleteBoardSubmissions(harness.gameId, "A", 1, 1);

    expect(await findBoardSubmissions(harness.gameId, "A", 1, 1)).toHaveLength(
      0,
    );
  });

  it("returns an empty array when no submissions match", async () => {
    const { findBoardSubmissions } = await import(
      "@/db/games/queries/find-submissions"
    );
    expect(await findBoardSubmissions(harness.gameId, "B", 9, 9)).toEqual([]);
  });
});
