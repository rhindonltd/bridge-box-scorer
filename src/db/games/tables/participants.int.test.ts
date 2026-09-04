// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getTableConfig } from "drizzle-orm/sqlite-core";

import { participants } from "@/db/games/tables/participants";
import { players } from "@/db/games/tables/players";

/**
 * The `participant` table declares two foreign keys via `.references(() =>
 * players.id)` thunks and a `(table) => ({ uniquePair })` config callback.
 * Drizzle evaluates those callbacks lazily. Inspecting the table config with
 * `getTableConfig` forces them to run, covering the reference/config closures.
 */
describe("participants table schema", () => {
  it("resolves its foreign keys to players.id and its unique constraint", () => {
    const config = getTableConfig(participants);

    // Two foreign keys (player1, player2) both referencing players.id.
    expect(config.foreignKeys.length).toBe(2);
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      expect(ref.foreignTable).toBe(players);
      expect(ref.foreignColumns.map((c) => c.name)).toEqual(["id"]);
    }

    // The (table) => ({ uniquePair }) config produced a unique constraint over
    // (player1, player2).
    expect(config.uniqueConstraints.length).toBeGreaterThan(0);
    const cols = config.uniqueConstraints[0].columns.map((c) => c.name);
    expect(cols).toEqual(["player1", "player2"]);
  });
});
