// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { makeBoard, seedFixtureMatch } from "@/mocks/fixtures/db-rows";
import type { NewBoard } from "@/db/games/tables/boards";

/**
 * Integration coverage for getResultsSummary against a real migrated per-game
 * database: it should count playable boards (excluding SIT_OUT and the Swiss
 * "2 half matches" HALF_AVERAGE compensation blocks), treat CONFIRMED /
 * OVERRIDDEN / CANCELLED as finalized, and only report allResultsIn once every
 * playable board is finalized.
 */
describe("getResultsSummary", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    seedFixtureMatch((await harness.getDb()) as Db);
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seed(rows: NewBoard[]) {
    const { createBoard } = await import("@/db/games/actions/create-board");
    for (const row of rows) {
      await createBoard(harness.gameId, row);
    }
  }

  it("reports not complete when there are no boards", async () => {
    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 0,
      finalized: 0,
      allResultsIn: false,
    });
  });

  it("reports complete when every playable board is CONFIRMED", async () => {
    await seed([
      makeBoard({ boardNumber: 1, status: "CONFIRMED" }),
      makeBoard({ boardNumber: 2, status: "CONFIRMED" }),
    ]);

    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 2,
      finalized: 2,
      allResultsIn: true,
    });
  });

  it("counts an OVERRIDDEN board as finalized", async () => {
    await seed([
      makeBoard({ boardNumber: 1, status: "CONFIRMED" }),
      makeBoard({ boardNumber: 2, status: "OVERRIDDEN" }),
    ]);

    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 2,
      finalized: 2,
      allResultsIn: true,
    });
  });

  it("counts a CANCELLED (fouled) board as finalized", async () => {
    await seed([
      makeBoard({ boardNumber: 1, status: "CONFIRMED" }),
      makeBoard({
        boardNumber: 2,
        status: "CANCELLED",
        directorOverrideResult: "A60/60" as NewBoard["directorOverrideResult"],
      }),
    ]);

    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 2,
      finalized: 2,
      allResultsIn: true,
    });
  });

  it("counts a REMOVED_TEAMS board as finalized", async () => {
    await seed([
      makeBoard({ boardNumber: 1, status: "CONFIRMED" }),
      makeBoard({
        boardNumber: 2,
        status: "REMOVED_TEAMS",
        directorOverrideResult:
          "TRM:EW_FAULT" as NewBoard["directorOverrideResult"],
      }),
    ]);

    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 2,
      finalized: 2,
      allResultsIn: true,
    });
  });

  it("reports not complete while a NOT_PLAYED board remains", async () => {
    await seed([
      makeBoard({ boardNumber: 1, status: "CONFIRMED" }),
      makeBoard({ boardNumber: 2, status: "NOT_PLAYED" }),
    ]);

    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 2,
      finalized: 1,
      allResultsIn: false,
    });
  });

  it("reports not complete while a PENDING_CONFIRMATION board remains", async () => {
    await seed([
      makeBoard({ boardNumber: 1, status: "CONFIRMED" }),
      makeBoard({ boardNumber: 2, status: "PENDING_CONFIRMATION" }),
    ]);

    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 2,
      finalized: 1,
      allResultsIn: false,
    });
  });

  it("excludes SIT_OUT boards from the playable denominator", async () => {
    await seed([
      makeBoard({ boardNumber: 1, status: "CONFIRMED" }),
      makeBoard({ boardNumber: 2, tableNumber: 2, status: "SIT_OUT" }),
    ]);

    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 1,
      finalized: 1,
      allResultsIn: true,
    });
  });

  it("reports not complete when only SIT_OUT boards exist", async () => {
    await seed([makeBoard({ boardNumber: 1, status: "SIT_OUT" })]);

    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 0,
      finalized: 0,
      allResultsIn: false,
    });
  });

  it("excludes HALF_AVERAGE compensation boards from the playable denominator", async () => {
    // A Swiss "2 half matches" round: the anchor's two played halves are
    // CONFIRMED, and the two non-anchors' missed halves are HALF_AVERAGE
    // compensation blocks the scorer resolves. The round is complete once the
    // played halves are in — the HALF_AVERAGE rows must not keep it open.
    await seed([
      makeBoard({ boardNumber: 1, status: "CONFIRMED" }),
      makeBoard({ boardNumber: 2, status: "CONFIRMED" }),
      makeBoard({ boardNumber: 2, tableNumber: 2, status: "HALF_AVERAGE" }),
      makeBoard({ boardNumber: 1, tableNumber: 3, status: "HALF_AVERAGE" }),
    ]);

    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 2,
      finalized: 2,
      allResultsIn: true,
    });
  });

  it("reports not complete when only HALF_AVERAGE boards exist", async () => {
    await seed([makeBoard({ boardNumber: 1, status: "HALF_AVERAGE" })]);

    const { getResultsSummary } = await import(
      "@/db/games/queries/get-results-summary"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getResultsSummary(db)).toEqual({
      totalPlayable: 0,
      finalized: 0,
      allResultsIn: false,
    });
  });
});
