import { eq, inArray, max, min } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";

/** One teams match (or triple comparison) and the rounds its boards span. */
export interface TeamMatchRoundsRow {
  home: string;
  opponent: string | null;
  firstRound: number;
  lastRound: number;
}

/**
 * Every teams match (TEAMS and TRIPLE kinds) with the first and last rounds its
 * boards are played in, across all sections. A match whose two rooms are played
 * in different rounds (American Whist) spans several rounds; the score breaks
 * are worked out from these spans.
 */
export async function readTeamMatchRounds(
  db: Db,
): Promise<TeamMatchRoundsRow[]> {
  const rows = await db
    .select({
      home: matches.home,
      opponent: matches.opponent,
      firstRound: min(boards.roundNumber),
      lastRound: max(boards.roundNumber),
    })
    .from(matches)
    .innerJoin(boards, eq(boards.matchId, matches.id))
    .where(inArray(matches.kind, ["TEAMS", "TRIPLE"]))
    .groupBy(matches.id);
  // An inner join gives every grouped match at least one board, so neither
  // aggregate is null.
  return rows.map((r) => ({
    home: r.home,
    opponent: r.opponent,
    firstRound: r.firstRound!,
    lastRound: r.lastRound!,
  }));
}
