import type { PlayerRecord } from "@/model/participants";

/**
 * A pair's schedule, built from its board rows: which boards it plays in which
 * round, at which table, against whom, with sit-out, half-match, late-arrival
 * and withdrawn-opponent rounds marked. Pure: the core reads the rows
 * (`schedule-service.ts`) and passes them in.
 */

/** A board row as this pair sees it, grouped under its round. */
export type PairBoardRow = {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  status: string | null;
  ns: string;
  ew: string;
  /**
   * The board's place in the order its table plays the round (1 = first), or
   * null/absent to play the round's boards in board-number order.
   */
  playOrder?: number | null;
};

/** The two players seated as one pair, by the board id their rows carry. */
export type SchedulePairPlayers = {
  player1: PlayerRecord;
  player2: PlayerRecord;
};

/** What a pair's schedule is built from. */
export interface ScheduleInput {
  /** Every board row this pair appears in (as NS or EW). */
  pairBoards: PairBoardRow[];
  /** Board id → the two players sitting there, for the whole game. */
  players: Map<string, SchedulePairPlayers>;
  /** The id this pair's board rows carry. */
  assignmentId: string;
  /** §2.4.7: empty seats the director marked "expected late". */
  expectedLateSeats: Set<string>;
  /** The game's total rounds, so rounds this pair has no boards in are padded. */
  totalRounds: number;
  /**
   * The rounds after which this pair's team scores up (see
   * `scoreBreakRounds`). Empty for a pairs game, which has none.
   */
  scoreBreakRounds: Set<number>;
}

/** The pair's rounds, in round order, padded to the game's total rounds. */
export function buildScheduleRounds(input: ScheduleInput): ScheduleRound[] {
  const breaks = input.scoreBreakRounds;
  const rounds = assembleRounds(
    input.pairBoards,
    input.players,
    input.assignmentId,
    input.expectedLateSeats,
  ).map((round) =>
    breaks.has(round.roundNumber) ? { ...round, scoreBreakAfter: true } : round,
  );
  return padSitOutRounds(rounds, input.totalRounds);
}

/** The four seat players for one table, as resolved from an assignment lookup. */
export type TablePlayers = {
  N: PlayerRecord | null;
  S: PlayerRecord | null;
  E: PlayerRecord | null;
  W: PlayerRecord | null;
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
  /**
   * §2.4.7: true when the opponent seat this round is an empty "expected late"
   * seat — the pair is still to arrive. The player's screen shows a "running
   * late" message rather than treating the empty opponent as a sit-out or a
   * blank table. False/absent for an ordinary round.
   */
  opponentExpectedLate?: boolean;
  /**
   * Design §11: true when every board this round is ABSENT — the opponents
   * withdrew, so there is nothing to play. The round-info screen says so and
   * offers Move on. (Such a round is already complete for the play-state
   * resolver; this only labels it when the client walks onto it.)
   */
  opponentWithdrawn?: boolean;
  /**
   * True when the pair's team scores up after this round: the away pair goes
   * back to its home table. Absent otherwise (and always in a pairs game).
   */
  scoreBreakAfter?: boolean;
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
  assignmentToPlayers: Map<string, SchedulePairPlayers>,
  assignmentId: string,
  expectedLateSeats: Set<string>,
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
      assembleRound(
        roundNumber,
        rows,
        assignmentToPlayers,
        assignmentId,
        expectedLateSeats,
      ),
    );
}

/** Resolve one assignment id to its four seat players (nulls when unknown). */
function tablePlayersFor(
  nsId: string,
  ewId: string,
  lookup: Map<string, SchedulePairPlayers>,
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
  lookup: Map<string, SchedulePairPlayers>,
  assignmentId: string,
  expectedLateSeats: Set<string>,
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

  // §2.4.7: this round's opponent is "running late" when its seat is marked
  // expected-late AND nobody is sitting there yet (no players resolve). The
  // opponent is the other side of this pair's played row.
  const opponentId =
    playedRows.length > 0
      ? playedRows[0].ns === assignmentId
        ? playedRows[0].ew
        : playedRows[0].ns
      : null;
  const opponentExpectedLate =
    opponentId != null &&
    expectedLateSeats.has(opponentId) &&
    !lookup.has(opponentId);

  // Design §11: every board this round was missed because the opponents
  // withdrew (the rows are ABSENT).
  const opponentWithdrawn =
    playedRows.length > 0 && playedRows.every((r) => r.status === "ABSENT");

  // The played boards (never SIT_OUT / HALF_AVERAGE), in the order the table
  // plays them: its own start when the boards circulate round the tables,
  // otherwise ascending.
  const boardStatuses = [...playedRows]
    .sort(
      (a, b) => (a.playOrder ?? a.boardNumber) - (b.playOrder ?? b.boardNumber),
    )
    .map((r) => ({ boardNumber: r.boardNumber, status: r.status }));
  const boards = boardStatuses.map((b) => b.boardNumber);

  const base: ActiveRound = {
    roundNumber,
    tableNumber,
    side,
    boards: isSitOut ? [] : boards,
    boardStatuses: isSitOut ? [] : boardStatuses,
    sitOut: isSitOut,
    players: tablePlayersFor(rows[0].ns, rows[0].ew, lookup),
    ...(opponentExpectedLate ? { opponentExpectedLate: true } : {}),
    ...(opponentWithdrawn ? { opponentWithdrawn: true } : {}),
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
  lookup: Map<string, SchedulePairPlayers>,
): ScheduleHalfMatch | null {
  if (playedRows.length === 0) return null;

  // The opponent on a played row is the other seat (ns if this pair is ew).
  const opponentOf = (r: PairBoardRow): string =>
    r.ns === assignmentId ? r.ew : r.ns;
  const opponents = new Set(playedRows.map(opponentOf));

  // Non-anchor: one real half plus a compensated half. It played the FIRST half
  // when all its played boards precede its compensated boards, else the SECOND.
  if (compensatedBoards.length > 0) {
    const sorted = [...playedRows].sort(
      (a, b) => a.boardNumber - b.boardNumber,
    );
    const boards = sorted.map((r) => r.boardNumber);
    const playedFirst = Math.max(...boards) < Math.min(...compensatedBoards);
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
