// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

/**
 * runPlayersMigrations must create the players schema in a fresh, empty data
 * directory — this is what the standalone sync CLI relies on to be
 * self-migrating on a newly provisioned box. It also exercises the
 * cwd-independent migrations-folder resolution.
 */

const created: string[] = [];

afterEach(() => {
  for (const dir of created.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
  vi.resetModules();
});

describe("runPlayersMigrations", () => {
  it("creates the players table in a fresh data directory", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bbs-players-migrate-"));
    created.push(dir);
    process.env.DATABASE_URL = dir;
    vi.resetModules();

    const { runPlayersMigrations } = await import("@/db/players/migrate");
    await runPlayersMigrations();

    const dbFile = path.join(dir, "players.db");
    expect(fs.existsSync(dbFile)).toBe(true);

    const db = new Database(dbFile, { readonly: true });
    try {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((r) => (r as { name: string }).name);
      expect(tables).toContain("players");
    } finally {
      db.close();
    }
  });
});
