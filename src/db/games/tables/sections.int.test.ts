import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { eq } from "drizzle-orm";

import * as schema from "@/db/games/schema";
import { sections } from "@/db/games/tables/sections";
import { boards } from "@/db/games/tables/boards";
import { boardSubmissions } from "@/db/games/tables/submissions";

/**
 * Builds a fresh per-game DB from the generated games migration and asserts the
 * section-aware schema: the `sections` table exists and `boards` /
 * `board_submissions` are keyed by section (and accept section-tagged rows).
 */
describe("games migration (section-aware schema)", () => {
  let dbFile: string;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeEach(() => {
    dbFile = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "games-mig-")),
      "game.db",
    );
    db = drizzle(new Database(dbFile), { schema });
    migrate(db, { migrationsFolder: "./drizzle/games" });
  });

  afterEach(() => {
    try {
      fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  });

  it("creates a queryable sections table", () => {
    db.insert(sections)
      .values({
        section: "A",
        label: "A",
        tables: 8,
        selectedMovement: null,
        ordinal: 0,
      })
      .run();

    const rows = db.select().from(sections).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ section: "A", label: "A", tables: 8 });
  });

  it("keys boards by section so two sections can share a (round, table, board)", () => {
    const base = {
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 1,
      ns: "n",
      ew: "e",
      status: "NOT_PLAYED" as const,
    };

    db.insert(boards)
      .values([
        { ...base, section: "A" },
        { ...base, section: "B" },
      ])
      .run();

    const all = db.select().from(boards).all();
    expect(all).toHaveLength(2);
    expect(all.map((b) => b.section).sort()).toEqual(["A", "B"]);
  });

  it("rejects duplicate boards within the same section", () => {
    const row = {
      section: "A",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 1,
      ns: "n",
      ew: "e",
      status: "NOT_PLAYED" as const,
    };

    db.insert(boards).values(row).run();
    expect(() => db.insert(boards).values(row).run()).toThrow();
  });

  it("keys board_submissions by section", () => {
    const base = {
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 1,
      side: "NS" as const,
    };

    db.insert(boardSubmissions)
      .values([
        { ...base, section: "A" },
        { ...base, section: "B" },
      ])
      .run();

    const all = db
      .select()
      .from(boardSubmissions)
      .where(eq(boardSubmissions.side, "NS"))
      .all();
    expect(all).toHaveLength(2);
  });
});
