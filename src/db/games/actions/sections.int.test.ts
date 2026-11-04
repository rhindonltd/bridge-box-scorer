// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { PairSeat } from "@/model/participants";

let tmpDir: string;
let gameId: string;

// Point the games DB directory at a fresh temp dir before importing the db
// modules, then build a migrated per-game DB per test WITHOUT the default
// "A" section seed (createGameDb seeds one), so these tests control the
// section set explicitly.
async function buildEmptyGameDb(dir: string, gameId: string) {
  const Database = (await import("better-sqlite3")).default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const schema = await import("@/db/games/schema");

  const dbFile = path.join(dir, `${gameId}.db`);
  const db = drizzle(new Database(dbFile), { schema });
  migrate(db, { migrationsFolder: "./drizzle/games" });
}

describe("section queries and actions", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sections-actions-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });

  async function setup() {
    await buildEmptyGameDb(tmpDir, gameId);
    const games = await import("@/db/games");
    const db = await games.getDb(gameId);
    if (!db) throw new Error("db not created");
    return { games, db };
  }

  it("creates sections, defaults label and ordinal, and lists them ordered", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { findSections } = await import(
      "@/db/games/queries/find-sections"
    );
    const { db } = await setup();

    await createSection(gameId, { section: "A", tables: 8 });
    await createSection(gameId, { section: "B", tables: 6, label: "North" });

    const rows = await findSections(db);
    expect(rows.map((r) => r.section)).toEqual(["A", "B"]);
    expect(rows[0]).toMatchObject({ label: "A", tables: 8, ordinal: 0 });
    expect(rows[1]).toMatchObject({ label: "North", tables: 6, ordinal: 1 });
  });

  it("rejects duplicate section letters", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    await setup();

    await createSection(gameId, { section: "A", tables: 8 });
    await expect(
      createSection(gameId, { section: "A", tables: 4 }),
    ).rejects.toThrow(/already exists/);
  });

  it("renames a section label without changing its letter", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { renameSection } = await import(
      "@/db/games/actions/rename-section"
    );
    const { findSections } = await import(
      "@/db/games/queries/find-sections"
    );
    const { db } = await setup();

    await createSection(gameId, { section: "A", tables: 8 });
    await renameSection(gameId, "A", "Red Room");

    const [row] = await findSections(db);
    expect(row).toMatchObject({ section: "A", label: "Red Room" });
  });

  it("resizes a section and sets/reads its movement", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { updateSectionTables } = await import(
      "@/db/games/actions/update-section-tables"
    );
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    const { getSectionMovement } = await import(
      "@/db/games/queries/get-section-movement"
    );
    const { findSections } = await import(
      "@/db/games/queries/find-sections"
    );
    const { db } = await setup();

    await createSection(gameId, { section: "B", tables: 6 });
    await updateSectionTables(gameId, "B", 9);

    const [row] = await findSections(db);
    expect(row.tables).toBe(9);

    expect(await getSectionMovement(db, "B")).toBeNull();

    await setSectionMovement(gameId, "B", {
      source: "MITCHELL",
      mitchell: { tables: 9, rounds: 9, boardsPerRound: 2 },
    });

    expect(await getSectionMovement(db, "B")).toEqual({
      source: "MITCHELL",
      mitchell: { tables: 9, rounds: 9, boardsPerRound: 2 },
    });
  });

  it("blocks shrinking a section below a seated table", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { updateSectionTables } = await import(
      "@/db/games/actions/update-section-tables"
    );
    const { db } = await setup();
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import(
      "@/db/games/tables/seat-occupancy"
    );

    await createSection(gameId, { section: "A", tables: 8 });

    // Seat a pair at A5NS.
    const p1 = db
      .insert(players)
      .values({ firstName: "A", lastName: "B" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "C", lastName: "D" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: "A5NS",
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: "k",
      })
      .run();

    await expect(updateSectionTables(gameId, "A", 4)).rejects.toThrow(
      /table 5 has seated participants/,
    );

    // Shrinking to exactly 5 (keeping the occupied table) is allowed.
    await expect(updateSectionTables(gameId, "A", 5)).resolves.toBeUndefined();
  });

  it("blocks deleting a section with seated participants", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { deleteSection } = await import(
      "@/db/games/actions/delete-section"
    );
    const { findSections } = await import(
      "@/db/games/queries/find-sections"
    );
    const { db } = await setup();
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import(
      "@/db/games/tables/seat-occupancy"
    );

    await createSection(gameId, { section: "A", tables: 8 });
    await createSection(gameId, { section: "B", tables: 4 });

    const p1 = db
      .insert(players)
      .values({ firstName: "A", lastName: "B" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "C", lastName: "D" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: "A1NS",
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: "k",
      })
      .run();

    await expect(deleteSection(gameId, "A")).rejects.toThrow(
      /seated participants/,
    );

    // B is empty, so it can be deleted.
    await deleteSection(gameId, "B");
    const rows = await findSections(db);
    expect(rows.map((r) => r.section)).toEqual(["A"]);
  });

  // A tiny helper: seat a pair at `seat` and return nothing. Each pair uses a
  // distinct player name pair so the unique(player1, player2) constraint holds.
  async function seatPair(
    db: Awaited<ReturnType<typeof setup>>["db"],
    seat: PairSeat,
    tag: string,
  ) {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import(
      "@/db/games/tables/seat-occupancy"
    );
    const p1 = db
      .insert(players)
      .values({ firstName: `${tag}1`, lastName: tag })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: `${tag}2`, lastName: tag })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat,
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: `k-${seat}`,
      })
      .run();
  }

  describe("splitSection", () => {
    it("splits a section, renumbering the moved tables' seated pairs", async () => {
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      const { splitSection } = await import(
        "@/db/games/actions/split-section"
      );
      const { findSections } = await import(
        "@/db/games/queries/find-sections"
      );
      const { findPairs } = await import("@/db/games/queries/find-pairs");
      const { db } = await setup();

      await createSection(gameId, { section: "A", tables: 6 });

      // Seat pairs across tables 1..6 of A (NS on each; a couple of EW too).
      await seatPair(db, "A1NS", "t1ns");
      await seatPair(db, "A5NS", "t5ns");
      await seatPair(db, "A5EW", "t5ew");
      await seatPair(db, "A6NS", "t6ns");

      // Move 2 tables (5 and 6) into a new section B; A keeps 1..4.
      const moves = await splitSection(gameId, {
        from: "A",
        newSection: "B",
        tablesToNewSection: 2,
        newLabel: "Spill",
        fromLabel: "Main",
      });

      const rows = await findSections(db);
      expect(rows.map((r) => [r.section, r.tables, r.label])).toEqual([
        ["A", 4, "Main"],
        ["B", 2, "Spill"],
      ]);

      // A5* -> B1*, A6NS -> B2NS; A1NS untouched.
      const seats = (await findPairs(db)).map((p) => p.initialSeat).sort();
      expect(seats).toEqual(["A1NS", "B1EW", "B1NS", "B2NS"].sort());

      // The returned moves describe exactly the renumbered (seated) seats, so
      // the caller can notify each affected device. A1NS did not move.
      expect([...moves].sort((a, b) => a.from.localeCompare(b.from))).toEqual([
        { from: "A5EW", to: "B1EW" },
        { from: "A5NS", to: "B1NS" },
        { from: "A6NS", to: "B2NS" },
      ]);
    });

    it("returns no moves when the moved tables are empty", async () => {
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      const { splitSection } = await import(
        "@/db/games/actions/split-section"
      );
      const { db } = await setup();

      await createSection(gameId, { section: "A", tables: 6 });
      // Seat only in the KEPT range (tables 1..4); tables 5-6 move but are empty.
      await seatPair(db, "A1NS", "t1ns");

      const moves = await splitSection(gameId, {
        from: "A",
        newSection: "B",
        tablesToNewSection: 2,
      });

      expect(moves).toEqual([]);
    });

    it("re-keys team names for the moved tables", async () => {
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      const { splitSection } = await import(
        "@/db/games/actions/split-section"
      );
      const { teams } = await import("@/db/games/tables/teams");
      const { db } = await setup();

      await createSection(gameId, { section: "A", tables: 4 });
      // Team at table 3 (id "A3") has a name; splitting after table 2 moves it
      // to the new section as "B1".
      db.insert(teams).values({ teamId: "A3", teamName: "Aces" }).run();
      db.insert(teams).values({ teamId: "A1", teamName: "Stays" }).run();

      await splitSection(gameId, {
        from: "A",
        newSection: "B",
        tablesToNewSection: 2,
      });

      const rows = db.select().from(teams).all();
      const byId = Object.fromEntries(rows.map((r) => [r.teamId, r.teamName]));
      expect(byId).toEqual({ A1: "Stays", B1: "Aces" });
    });

    it("renumbers expected-late marks on moved tables (and leaves kept ones)", async () => {
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      const { splitSection } = await import(
        "@/db/games/actions/split-section"
      );
      const { expectedLateSeats } = await import(
        "@/db/games/tables/expected-late-seats"
      );
      const { db } = await setup();

      await createSection(gameId, { section: "A", tables: 6 });
      // A2EW stays (table 2 kept); A5NS moves (table 5 -> B1).
      db.insert(expectedLateSeats).values({ seat: "A2EW" }).run();
      db.insert(expectedLateSeats).values({ seat: "A5NS" }).run();

      await splitSection(gameId, {
        from: "A",
        newSection: "B",
        tablesToNewSection: 2,
      });

      const seats = db
        .select({ seat: expectedLateSeats.seat })
        .from(expectedLateSeats)
        .all()
        .map((r) => r.seat)
        .sort();
      // A2EW untouched; A5NS followed its table to B1NS.
      expect(seats).toEqual(["A2EW", "B1NS"].sort());
    });

    it("clears the stored movement on both affected sections", async () => {
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      const { setSectionMovement } = await import(
        "@/db/games/actions/set-section-movement"
      );
      const { getSectionMovement } = await import(
        "@/db/games/queries/get-section-movement"
      );
      const { splitSection } = await import(
        "@/db/games/actions/split-section"
      );
      const { db } = await setup();

      await createSection(gameId, { section: "A", tables: 6 });
      await setSectionMovement(gameId, "A", {
        source: "MITCHELL",
        mitchell: { tables: 6, rounds: 6, boardsPerRound: 2 },
      });

      await splitSection(gameId, {
        from: "A",
        newSection: "B",
        tablesToNewSection: 2,
      });

      expect(await getSectionMovement(db, "A")).toBeNull();
      expect(await getSectionMovement(db, "B")).toBeNull();
    });

    it("rejects a section too small to split (fewer than 4 tables)", async () => {
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      const { splitSection } = await import(
        "@/db/games/actions/split-section"
      );
      await setup();

      await createSection(gameId, { section: "A", tables: 3 });

      await expect(
        splitSection(gameId, {
          from: "A",
          newSection: "B",
          tablesToNewSection: 2,
        }),
      ).rejects.toThrow(/at least 4/);
    });

    it("rejects an out-of-range split point (each side keeps 2+ tables)", async () => {
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      const { splitSection } = await import(
        "@/db/games/actions/split-section"
      );
      await setup();

      // A 6-table section can move 2..4 tables; 1 and 5 would leave a side with
      // fewer than 2 tables.
      await createSection(gameId, { section: "A", tables: 6 });

      await expect(
        splitSection(gameId, {
          from: "A",
          newSection: "B",
          tablesToNewSection: 1,
        }),
      ).rejects.toThrow(/at least 2 tables/);
      await expect(
        splitSection(gameId, {
          from: "A",
          newSection: "B",
          tablesToNewSection: 5,
        }),
      ).rejects.toThrow(/at least 2 tables/);
    });

    it("rejects an unknown source or a taken new letter", async () => {
      const { createSection } = await import(
        "@/db/games/actions/create-section"
      );
      const { splitSection } = await import(
        "@/db/games/actions/split-section"
      );
      await setup();

      await createSection(gameId, { section: "A", tables: 4 });
      await createSection(gameId, { section: "B", tables: 2 });

      await expect(
        splitSection(gameId, {
          from: "Z",
          newSection: "C",
          tablesToNewSection: 2,
        }),
      ).rejects.toThrow(/does not exist/);
      await expect(
        splitSection(gameId, {
          from: "A",
          newSection: "B",
          tablesToNewSection: 2,
        }),
      ).rejects.toThrow(/already exists/);
    });
  });
});
