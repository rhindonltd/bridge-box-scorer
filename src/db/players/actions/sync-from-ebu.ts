import "server-only";

import { parse } from "csv-parse/sync";

import { syncPlayers } from "@/db/players/actions/sync-ebu-players";
import { Player } from "@/db/players/schema";

/**
 * EBU player-list sync: fetch the EBU CSV, parse/validate it, and write it into
 * the local players database (upsert changed rows, prune players no longer in
 * the file — see `syncPlayers`).
 *
 * The fetch/parse logic lives here (separate from the thin CLI entry in
 * `src/scripts/sync-players.ts`) so it can be unit-tested without any network:
 * `parseEbuCsv` is pure and takes a CSV string.
 */

/** Source of the EBU player list. Hardcoded by design (see the sync spec). */
export const EBU_PLAYERS_URL =
  "http://www.ebu.co.uk/mpsysfiles/cn_r6eqzmi0zq.csv";

/**
 * Minimum plausible number of rows in the EBU file. A file smaller than this
 * almost certainly means a truncated/error response, and syncing it would prune
 * most of the real player list — so we abort instead.
 */
const MIN_EXPECTED_ROWS = 1000;

/** Fetch the raw EBU CSV. Throws on a non-OK response. */
export async function fetchPlayersCsv(): Promise<string> {
  const res = await fetch(EBU_PLAYERS_URL);

  if (!res.ok) {
    throw new Error(`Failed to fetch CSV: ${res.status}`);
  }

  return await res.text();
}

/**
 * Parse and validate the EBU CSV into `Player` rows. Pure (no network/DB) so it
 * is unit-testable. Throws if the CSV shape is unexpected or the file is
 * suspiciously small.
 */
export function parseEbuCsv(csv: string): Player[] {
  const rows: string[][] = parse(csv, {
    columns: false,
    skip_empty_lines: true,
  });

  const players = mapToPlayers(rows);

  if (players.length < MIN_EXPECTED_ROWS) {
    throw new Error("EBU file looks suspiciously small — aborting sync");
  }

  return players;
}

function mapToPlayers(rows: string[][]): Player[] {
  if (!rows[0] || !/^\d+$/.test(rows[0][0])) {
    throw new Error("Unexpected CSV format from EBU");
  }

  return rows
    .map((row) => {
      const ebuNumber = Number(row[0]);
      if (!ebuNumber) return null;

      return {
        ebuNumber,
        lastName: row[2]?.trim() || null,
        firstName: row[1]?.trim() || null,
      };
    })
    .filter((p): p is Player => p !== null);
}

/**
 * Full EBU sync: fetch → parse/validate → write. Returns the number of players
 * written so callers (the CLI) can log it. Requires network access to reach
 * ebu.co.uk.
 */
export async function syncPlayersFromEbu(): Promise<{ count: number }> {
  const csv = await fetchPlayersCsv();
  const playersData = parseEbuCsv(csv);

  await syncPlayers(playersData);

  return { count: playersData.length };
}
