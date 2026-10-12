import { parseSeat } from "@/model/participants";
import { swissPairIdFromParticipant } from "@/db/games/queries/swiss-board-history";
import type { SectionLeaderboard } from "@/services/leaderboard-service";
import type { SwissPairId } from "@/movement/swiss/swiss-pairing";

/**
 * Reads a section leaderboard's already-ranked `overallScore.lines` into the
 * stable ids and running VP totals the Swiss draw / mismatch services rank on.
 *
 * The leaderboard lines are keyed by a participant id (a pair's round-1 home
 * seat, or a team's home NS seat) and carry an optional `totalVP`. Pairs and
 * teams differ only in how a line's id is decoded, so each format supplies a
 * `decode` and shares the order / VP-map iteration.
 */
export interface LeaderboardDecoder<Id extends number> {
  /** Decode one leaderboard line into its stable id, or null to skip it. */
  decode: (line: Record<string, unknown>) => Id | null;
}

type Line = Record<string, unknown> & { totalVP?: number };

/**
 * The ranked ids, best-first, with duplicates and undecodable lines dropped.
 * Mirrors the order the overall plugin ranked the field on.
 */
export function decodeStandingsOrder<Id extends number>(
  board: SectionLeaderboard | undefined,
  { decode }: LeaderboardDecoder<Id>,
): Id[] {
  if (!board) return [];
  const order: Id[] = [];
  const seen = new Set<Id>();
  for (const line of board.overallScore.lines as unknown as Line[]) {
    const id = decode(line);
    if (id != null && !seen.has(id)) {
      order.push(id);
      seen.add(id);
    }
  }
  return order;
}

/** Each id's current total VP (0 when a line carries none). */
export function decodeVpById<Id extends number>(
  board: SectionLeaderboard | undefined,
  { decode }: LeaderboardDecoder<Id>,
): Map<Id, number> {
  const map = new Map<Id, number>();
  if (!board) return map;
  for (const line of board.overallScore.lines as unknown as Line[]) {
    const id = decode(line);
    if (id != null) map.set(id, line.totalVP ?? 0);
  }
  return map;
}

/**
 * Pairs decoder: a leaderboard line's `pairId` (its section-qualified round-1
 * home seat) → stable integer Swiss pair id. Depends on the field size, so it
 * is a factory keyed by `tables`.
 */
export function pairLeaderboardDecoder(
  tables: number,
): LeaderboardDecoder<SwissPairId> {
  return {
    decode: (line) =>
      swissPairIdFromParticipant(line.pairId as string, tables),
  };
}

/**
 * Teams decoder: a leaderboard line's `teamId` (its home NS seat, e.g. "A1NS")
 * → home-table team id. A non-seat id (should not occur) decodes to null.
 */
export const teamLeaderboardDecoder: LeaderboardDecoder<number> = {
  decode: (line) => {
    try {
      return parseSeat(line.teamId as string).tableNumber;
    } catch {
      return null;
    }
  },
};
