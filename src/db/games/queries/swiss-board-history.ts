import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { and, eq, lt } from "drizzle-orm";
import { SectionLetter, parseSeat } from "@/model/participants";
import {
  opponentKey,
  swissPairIdFromHomeSeat,
  type SwissPairId,
} from "@/movement/swiss/swiss-pairing";

/**
 * The Swiss history derived from a section's played boards, in exactly the
 * shape {@link drawSwissRound} consumes. Everything the pairing engine needs
 * about the past — who has met whom, who has had a bye, and how often each pair
 * has sat each direction — lives in the `boards` rows, so this query is the
 * single bridge between the persisted schedule and the pure engine.
 *
 * Pair ids here are the Swiss stable integer ids (see the pairing module),
 * recovered from the section-qualified home-seat ids stored on each board row
 * (a pair's id is its round-1 seat, e.g. "A1NS" is pair 1, "A2EW" is pair
 * tables+2).
 */
export interface SwissBoardHistory {
  /** Unordered-pair keys ({@link opponentKey}) for every matchup already played. */
  playedOpponents: Set<string>;
  /** Pair ids that have had a bye (appeared on a SIT_OUT row). */
  hadBye: Set<SwissPairId>;
  /**
   * Pair ids that have been in a 2-half-matches group (anchor or non-anchor).
   * A non-anchor is recovered from its HALF_AVERAGE compensation row; the
   * anchor from playing two DIFFERENT opponents at the same table in one round.
   * Consulted (with {@link hadBye}) to spread the half-match burden fairly.
   */
  hadHalfMatch: Set<SwissPairId>;
  /** Per pair, the number of rounds sat North/South and East/West so far. */
  directionCounts: Map<SwissPairId, { ns: number; ew: number }>;
  /** The highest round number materialized so far (0 when none). */
  highestRound: number;
}

/**
 * Recover a Swiss stable pair id from the participant id stored on a board row.
 *
 * Swiss participant ids are a pair's round-1 home seat (section-qualified, e.g.
 * "A1NS"): the table + direction decode to the stable integer id via the same
 * numbering the pairing engine uses. Returns null for anything that isn't a
 * valid seat (e.g. the sit-out phantom), so callers skip non-pair seats.
 */
export function swissPairIdFromParticipant(
  participantId: string,
  tables: number,
): SwissPairId | null {
  let parsed;
  try {
    parsed = parseSeat(participantId);
  } catch {
    return null;
  }
  return swissPairIdFromHomeSeat(tables, {
    tableNumber: parsed.tableNumber,
    direction: parsed.direction,
  });
}

/**
 * Read a section's played boards and reduce them to the Swiss history the
 * pairing engine needs.
 *
 * `tables` is the Swiss table count, needed to decode a home-seat id back to a
 * stable pair id. Direction counts are per round, not per board: a round lays
 * down several board rows for the same seating, so each (pair, round,
 * direction) is counted once. Sit-out rows contribute a bye for their pair but
 * no opponent or direction (the pair played no boards that round).
 */
export async function getSwissBoardHistory(
  db: Db,
  section: SectionLetter,
  tables: number,
  /**
   * When set, only rounds BEFORE this one are reduced (`roundNumber < max`).
   * Used by §3.5 mismatch detection to rebuild the history the round-R draw
   * consumed; omit for the live "as of now" history the next draw uses.
   */
  maxRoundExclusive?: number,
): Promise<SwissBoardHistory> {
  const matchWhere =
    maxRoundExclusive != null
      ? and(
          eq(matches.section, section),
          lt(matches.roundNumber, maxRoundExclusive),
        )
      : eq(matches.section, section);
  const boardWhere =
    maxRoundExclusive != null
      ? and(
          eq(boards.section, section),
          lt(boards.roundNumber, maxRoundExclusive),
        )
      : eq(boards.section, section);

  // Structure (who met whom, byes, half-matches) comes from the first-class
  // `matches` table; the per-pair direction counts and the highest round are
  // per-board-row facts, so those stay a `boards` read.
  const [matchRows, boardRows] = await Promise.all([
    db.select().from(matches).where(matchWhere),
    db
      .select({
        roundNumber: boards.roundNumber,
        ns: boards.ns,
        ew: boards.ew,
        status: boards.status,
      })
      .from(boards)
      .where(boardWhere),
  ]);

  const playedOpponents = new Set<string>();
  const hadBye = new Set<SwissPairId>();
  const hadHalfMatch = new Set<SwissPairId>();
  const directionCounts = new Map<SwissPairId, { ns: number; ew: number }>();
  let highestRound = 0;

  // --- Structure, from `matches` ---
  for (const m of matchRows) {
    const homeId = swissPairIdFromParticipant(m.home, tables);
    const oppId =
      m.opponent != null ? swissPairIdFromParticipant(m.opponent, tables) : null;

    if (m.kind === "BYE") {
      if (homeId != null) hadBye.add(homeId);
      continue;
    }

    if (m.kind === "HALF_MATCH") {
      // Every pair in the 2-half-matches group (anchor via its two real halves,
      // each non-anchor via its real half + compensation block) was in a
      // half-match. Both the home and opponent seats recorded here cover them.
      if (homeId != null) hadHalfMatch.add(homeId);
      if (oppId != null) hadHalfMatch.add(oppId);
      // A real half-match comparison is still a played opponent pairing.
      if (homeId != null && oppId != null) {
        playedOpponents.add(opponentKey(homeId, oppId));
      }
      continue;
    }

    // Ordinary PAIRS head-to-head.
    if (homeId != null && oppId != null) {
      playedOpponents.add(opponentKey(homeId, oppId));
    }
  }

  // --- Direction counts + highest round, from `boards` ---
  // Dedupe direction tallies to one per (pair, round): a round has many board
  // rows but a single seating.
  const nsCounted = new Set<string>();
  const ewCounted = new Set<string>();

  const bump = (
    id: SwissPairId,
    direction: "ns" | "ew",
    round: number,
  ): void => {
    const seen = direction === "ns" ? nsCounted : ewCounted;
    const key = `${id}@${round}`;
    if (seen.has(key)) return;
    seen.add(key);
    const counts = directionCounts.get(id) ?? { ns: 0, ew: 0 };
    counts[direction] += 1;
    directionCounts.set(id, counts);
  };

  for (const row of boardRows) {
    highestRound = Math.max(highestRound, row.roundNumber);

    // Sit-out / half-average compensation rows carry a phantom opponent and the
    // pair played no real boards that direction/round, matching the original
    // reducer which skipped them before bumping direction counts.
    if (row.status === "SIT_OUT" || row.status === "HALF_AVERAGE") continue;

    const nsId = swissPairIdFromParticipant(row.ns, tables);
    const ewId = swissPairIdFromParticipant(row.ew, tables);
    if (nsId != null) bump(nsId, "ns", row.roundNumber);
    if (ewId != null) bump(ewId, "ew", row.roundNumber);
  }

  return { playedOpponents, hadBye, hadHalfMatch, directionCounts, highestRound };
}
