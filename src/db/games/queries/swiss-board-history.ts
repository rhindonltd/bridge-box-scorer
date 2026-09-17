import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { eq } from "drizzle-orm";
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
): Promise<SwissBoardHistory> {
  const rows = await db
    .select({
      roundNumber: boards.roundNumber,
      ns: boards.ns,
      ew: boards.ew,
      status: boards.status,
    })
    .from(boards)
    .where(eq(boards.section, section));

  const playedOpponents = new Set<string>();
  const hadBye = new Set<SwissPairId>();
  const directionCounts = new Map<SwissPairId, { ns: number; ew: number }>();
  let highestRound = 0;

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

  for (const row of rows) {
    highestRound = Math.max(highestRound, row.roundNumber);

    const nsId = swissPairIdFromParticipant(row.ns, tables);
    const ewId = swissPairIdFromParticipant(row.ew, tables);

    if (row.status === "SIT_OUT") {
      // A sit-out row's occupied seat carries the sitting-out pair; the other
      // seat is a phantom. Whichever id(s) resolve get a bye recorded.
      if (nsId != null) hadBye.add(nsId);
      if (ewId != null) hadBye.add(ewId);
      continue;
    }

    if (nsId != null && ewId != null) {
      playedOpponents.add(opponentKey(nsId, ewId));
    }
    if (nsId != null) bump(nsId, "ns", row.roundNumber);
    if (ewId != null) bump(ewId, "ew", row.roundNumber);
  }

  return { playedOpponents, hadBye, directionCounts, highestRound };
}
