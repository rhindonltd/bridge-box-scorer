import type { SwissVpBoardRow } from "./swiss-vp-overall";
import type { SwissVpMatchRow } from "./swiss-vp-round";

/**
 * TEST-ONLY: derive the PAIRS `matches`-structure rows (with their rulings) a
 * set of Swiss Pairs board rows implies, AND stamp a `matchId` on each board
 * row, so the Swiss VP scorers can be unit-tested from board-row scenarios.
 *
 * In production these match rows are WRITTEN by the materialiser and the
 * rulings by the director actions; the scorer reads them back. This helper
 * reconstructs them from the board topology (one PAIRS match per (round,
 * table)) and lifts the ruling off the board scenario fields the OLD tests
 * used:
 *   - a `VOID_PAIR` status with a `VOIDP:` token in `directorOverrideResult`
 *     → the match's `ruling` (and the board's override is cleared, since in the
 *     new model the void token no longer lives on the board);
 *   - a `MISMATCH` status with an `MM:` token in `matchRuling`
 *     → the match's `ruling` (and the board keeps its real played result).
 *
 * Returns the match rows plus the board rows re-stamped with their `matchId`.
 * Lives outside the production module — scaffolding for the unit tests only
 * (the int tests exercise the real materialiser-written rows + director
 * actions end-to-end).
 */
export function swissVpStructureFromRows(rows: SwissVpBoardRow[]): {
  matchRows: SwissVpMatchRow[];
  boardRows: SwissVpBoardRow[];
} {
  interface Group {
    id: number;
    roundNumber: number;
    kind: "PAIRS" | "BYE";
    home: string;
    opponent: string | null;
    ruling: string | null;
  }

  const groups = new Map<string, Group>();
  let nextId = 1;

  const keyOf = (r: SwissVpBoardRow) =>
    `${r.section}|${r.roundNumber}|${r.tableNumber}`;

  // First pass: one group per (section, round, table).
  for (const r of rows) {
    const key = keyOf(r);
    let g = groups.get(key);
    if (!g) {
      const kind: Group["kind"] = r.status === "SIT_OUT" ? "BYE" : "PAIRS";
      g = {
        id: nextId++,
        roundNumber: r.roundNumber,
        kind,
        home: r.ns,
        opponent: kind === "BYE" ? null : r.ew,
        ruling: null,
      };
      groups.set(key, g);
    }
    // Lift a ruling off the scenario fields.
    if (r.status === "VOID_PAIR" && r.directorOverrideResult != null) {
      g.ruling = r.directorOverrideResult as string;
    } else if (
      r.status === "MISMATCH" &&
      // The old scenarios put the MM token on `matchRuling`.
      (r as { matchRuling?: string | null }).matchRuling != null
    ) {
      g.ruling = (r as { matchRuling?: string | null }).matchRuling as string;
    }
  }

  // Second pass: re-stamp each board with its match id, and in the new model
  // clear the VOID_PAIR override token off the board (it lives on the match).
  const boardRows = rows.map((r) => {
    const g = groups.get(keyOf(r))!;
    const next: SwissVpBoardRow = { ...r, matchId: g.id };
    if (r.status === "VOID_PAIR") {
      next.directorOverrideResult = null;
    }
    return next;
  });

  const matchRows: SwissVpMatchRow[] = [...groups.values()].map((g) => ({
    id: g.id,
    roundNumber: g.roundNumber,
    kind: g.kind,
    home: g.home,
    opponent: g.opponent,
    ruling: g.ruling,
  }));

  return { matchRows, boardRows };
}
