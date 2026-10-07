import "server-only";

import { eq, or } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { assignments as pairAssignments } from "@/db/games/tables/assignments";
import type { Player } from "@/db/games/tables/players";
import { PairSeat } from "@/model/participants";
import {
  buildAssignmentPlayerLookup,
  type PairPlayers,
} from "@/db/games/queries/assignment-players";

/** A board row as this pair sees it, grouped under its round. */
type PairBoardRow = {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  status: string | null;
  ns: string;
  ew: string;
};

/**
 * Build a player schedule for a single seat: which boards this pair plays in
 * which round, at which table, against whom, plus sit-out rounds padded in.
 *
 * The steps are deliberately kept as separate helpers (assignment lookup →
 * this pair's boards → the game-wide player lookup → round assembly →
 * total-round padding). The DB reads run in a fixed order.
 */
export async function getSchedule(db: Db, seat: string) {
  const assignment = await findAssignment(db, seat);
  if (!assignment) {
    return null;
  }

  const assignmentId = assignment.id;
  // The pair's side for submission is based on the initialSeat suffix.
  const side: "NS" | "EW" = seat.endsWith("NS") ? "NS" : "EW";

  const pairBoards = (await findPairBoards(db, assignmentId)) as PairBoardRow[];

  // Game-wide lookup from an assignment id to the two players sitting there.
  const assignmentToPlayers = await buildAssignmentPlayerLookup(db);

  const rounds = assembleRounds(pairBoards, assignmentToPlayers, assignmentId);

  const totalRounds = await countTotalRounds(db);

  return { assignmentId, side, rounds: padSitOutRounds(rounds, totalRounds) };
}

// --- DB reads (kept in a fixed call order the tests rely on) -------------

/** Look up this seat's assignment row (null when the seat has none yet). */
function findAssignment(db: Db, seat: string) {
  return db
    .select()
    .from(pairAssignments)
    .where(eq(pairAssignments.initialSeat, seat as PairSeat))
    .get();
}

/** All board rows in which this pair appears as NS or EW. */
function findPairBoards(db: Db, assignmentId: string) {
  return db
    .select()
    .from(pairsBoards)
    .where(
      or(eq(pairsBoards.ns, assignmentId), eq(pairsBoards.ew, assignmentId)),
    );
}

/** Total rounds in the game, from ALL boards (not just this pair's). */
async function countTotalRounds(db: Db): Promise<number> {
  const allGameBoards = await db
    .select({ roundNumber: pairsBoards.roundNumber })
    .from(pairsBoards);
  const allRoundNumbers = new Set(allGameBoards.map((b) => b.roundNumber));
  return allRoundNumbers.size > 0 ? Math.max(...allRoundNumbers) : 0;
}

// --- Pure assembly -------------------------------------------------------

/** The four seat players for one table, as resolved from an assignment lookup. */
type TablePlayers = {
  N: Player | null;
  S: Player | null;
  E: Player | null;
  W: Player | null;
};

/**
 * One half of a 2-half-matches round, for the round-info display. The anchor
 * has two segments (its two opponents across the midpoint); a non-anchor has
 * one (its played half). `half` is which half of the round it is.
 */
export type HalfMatchSegment = {
  half: "first" | "second";
  boards: number[];
  players: TablePlayers;
};

/**
 * The 2-half-matches shape of a round for this pair, when it is in the group.
 * - `anchor`: plays both halves at its table (two segments, opponent change at
 *   the midpoint).
 * - `firstHalf` / `secondHalf`: a non-anchor plays only that half (one segment);
 *   the rest of the round is an average-plus credit it does not play.
 */
export type ScheduleHalfMatch = {
  role: "anchor" | "firstHalf" | "secondHalf";
  segments: HalfMatchSegment[];
};

type ActiveRound = {
  roundNumber: number;
  tableNumber: number;
  /** Which side this pair sits for the round (they can switch in some movements). */
  side: "NS" | "EW";
  boards: number[];
  boardStatuses: { boardNumber: number; status: string | null }[];
  sitOut: boolean;
  players: TablePlayers;
  /** Present only for a 2-half-matches round this pair is in; else absent. */
  halfMatch?: ScheduleHalfMatch;
};

export type ScheduleRound = Omit<
  ActiveRound,
  "tableNumber" | "side" | "sitOut"
> & {
  tableNumber: number | null;
  side?: "NS" | "EW";
  sitOut?: boolean;
};

/**
 * Turn this pair's flat board rows into per-round entries, resolving the
 * players at each round's table and flagging all-SIT_OUT rounds. Rounds are
 * returned in ascending round-number order.
 */
function assembleRounds(
  pairBoards: PairBoardRow[],
  assignmentToPlayers: Map<string, PairPlayers>,
  assignmentId: string,
): ActiveRound[] {
  // Group this pair's rows by round, keeping ALL rows (a 2-half-matches round
  // has rows for two opponents and/or HALF_AVERAGE compensation rows, so a
  // single ns/ew per round is not enough).
  const roundMap = new Map<number, PairBoardRow[]>();
  for (const b of pairBoards) {
    const rows = roundMap.get(b.roundNumber) ?? [];
    rows.push(b);
    roundMap.set(b.roundNumber, rows);
  }

  return Array.from(roundMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, rows]) =>
      assembleRound(roundNumber, rows, assignmentToPlayers, assignmentId),
    );
}

/** Resolve one assignment id to its four seat players (nulls when unknown). */
function tablePlayersFor(
  nsId: string,
  ewId: string,
  lookup: Map<string, PairPlayers>,
): TablePlayers {
  const ns = lookup.get(nsId);
  const ew = lookup.get(ewId);
  return {
    N: ns?.player1 ?? null,
    S: ns?.player2 ?? null,
    E: ew?.player1 ?? null,
    W: ew?.player2 ?? null,
  };
}

/** Build one round entry for this pair from its rows that round. */
function assembleRound(
  roundNumber: number,
  rows: PairBoardRow[],
  lookup: Map<string, PairPlayers>,
  assignmentId: string,
): ActiveRound {
  const tableNumber = rows[0].tableNumber;

  // A sit-out (bye) round: every row is SIT_OUT. Keep the table (so the player
  // is told where to wait) but expose no playable boards.
  const isSitOut = rows.length > 0 && rows.every((r) => r.status === "SIT_OUT");

  // The played rows (exclude SIT_OUT and HALF_AVERAGE — neither is played by
  // this pair). The distinct opponents across the played rows decide whether
  // this is a half-match ANCHOR (two opponents) or an ordinary round (one).
  const playedRows = rows.filter(
    (r) => r.status !== "SIT_OUT" && r.status !== "HALF_AVERAGE",
  );

  const side: "NS" | "EW" =
    (playedRows[0] ?? rows[0]).ns === assignmentId ? "NS" : "EW";

  // The played boards (never SIT_OUT / HALF_AVERAGE), ascending.
  const boardStatuses = playedRows
    .map((r) => ({ boardNumber: r.boardNumber, status: r.status }))
    .sort((a, b) => a.boardNumber - b.boardNumber);
  const boards = boardStatuses.map((b) => b.boardNumber);

  const base: ActiveRound = {
    roundNumber,
    tableNumber,
    side,
    boards: isSitOut ? [] : boards,
    boardStatuses: isSitOut ? [] : boardStatuses,
    sitOut: isSitOut,
    players: tablePlayersFor(rows[0].ns, rows[0].ew, lookup),
  };

  if (isSitOut) return base;

  const compensatedBoards = rows
    .filter((r) => r.status === "HALF_AVERAGE")
    .map((r) => r.boardNumber);

  const halfMatch = detectHalfMatch(
    playedRows,
    compensatedBoards,
    assignmentId,
    lookup,
  );
  if (halfMatch) {
    // The round-info players reflect the first segment's opponents.
    const firstSeg = halfMatch.segments[0];
    return { ...base, players: firstSeg.players, halfMatch };
  }

  return base;
}

/**
 * Detect and describe this pair's role in a 2-half-matches round, or null for
 * an ordinary round.
 *
 * - A pair with a HALF_AVERAGE row is a NON-ANCHOR: it plays one half (its
 *   played rows) and is compensated for the other — `firstHalf` or `secondHalf`
 *   by which board subset it played relative to the compensated boards.
 * - A pair whose played rows face TWO distinct opponents at its table is the
 *   ANCHOR: two segments, the opponent changing at the midpoint.
 */
function detectHalfMatch(
  playedRows: PairBoardRow[],
  compensatedBoards: number[],
  assignmentId: string,
  lookup: Map<string, PairPlayers>,
): ScheduleHalfMatch | null {
  if (playedRows.length === 0) return null;

  // The opponent on a played row is the other seat (ns if this pair is ew).
  const opponentOf = (r: PairBoardRow): string =>
    r.ns === assignmentId ? r.ew : r.ns;
  const opponents = new Set(playedRows.map(opponentOf));

  // Non-anchor: one real half plus a compensated half. It played the FIRST half
  // when all its played boards precede its compensated boards, else the SECOND.
  if (compensatedBoards.length > 0) {
    const sorted = [...playedRows].sort((a, b) => a.boardNumber - b.boardNumber);
    const boards = sorted.map((r) => r.boardNumber);
    const playedFirst =
      Math.max(...boards) < Math.min(...compensatedBoards);
    const half: "first" | "second" = playedFirst ? "first" : "second";
    const players = tablePlayersFor(sorted[0].ns, sorted[0].ew, lookup);
    return {
      role: playedFirst ? "firstHalf" : "secondHalf",
      segments: [{ half, boards, players }],
    };
  }

  // Anchor: exactly the pair facing two distinct opponents at one table.
  if (opponents.size >= 2) {
    const byOpponent = new Map<string, PairBoardRow[]>();
    for (const r of playedRows) {
      const key = opponentOf(r);
      const arr = byOpponent.get(key) ?? [];
      arr.push(r);
      byOpponent.set(key, arr);
    }
    // Order the two opponent segments by their lowest board number (half 1 is
    // the lower board subset).
    const segments = [...byOpponent.values()]
      .map((segRows) => {
        const sorted = [...segRows].sort(
          (a, b) => a.boardNumber - b.boardNumber,
        );
        return {
          boards: sorted.map((r) => r.boardNumber),
          players: tablePlayersFor(sorted[0].ns, sorted[0].ew, lookup),
          lowest: sorted[0].boardNumber,
        };
      })
      .sort((a, b) => a.lowest - b.lowest);

    return {
      role: "anchor",
      segments: segments.map((s, i) => ({
        half: i === 0 ? "first" : "second",
        boards: s.boards,
        players: s.players,
      })),
    };
  }

  return null;
}

/**
 * Pad the pair's active rounds up to `totalRounds`, inserting a tableless
 * sit-out marker for any round in which this pair has no board rows at all.
 */
function padSitOutRounds(
  rounds: ActiveRound[],
  totalRounds: number,
): ScheduleRound[] {
  const completeRounds: ScheduleRound[] = [];

  for (let r = 1; r <= totalRounds; r++) {
    const activeRound = rounds.find((round) => round.roundNumber === r);
    if (activeRound) {
      completeRounds.push(activeRound);
    } else {
      completeRounds.push({
        roundNumber: r,
        tableNumber: null,
        boards: [],
        boardStatuses: [],
        players: { N: null, S: null, E: null, W: null },
        sitOut: true,
      });
    }
  }

  return completeRounds;
}
