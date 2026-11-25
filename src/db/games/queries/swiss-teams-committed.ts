import { Db } from "@/db/games";
import { matches } from "@/db/games/tables/matches";
import { and, eq, lt } from "drizzle-orm";
import { SectionLetter } from "@/model/participants";
import type { TeamId } from "@/model/teams-match-layout";
import {
  swissTeamsCommittedRound,
  swissTeamsHistory,
  type SwissTeamsCommittedRound,
} from "@/modules/swiss";

/**
 * Reads for Swiss Teams §3.5 mismatch detection. The folds from match rows are
 * in the swiss module (`swissTeamsHistory`, `swissTeamsCommittedRound`).
 */

/** The teams history over rounds `< maxRoundExclusive`, as the round-R draw saw it. */
export interface SwissTeamsPriorHistory {
  playedOpponents: Set<string>;
  hadBye: Set<TeamId>;
  hadTriple: Set<TeamId>;
}

/** Read a section's match rows, optionally only rounds `< maxRoundExclusive`. */
async function sectionMatches(
  db: Db,
  section: SectionLetter,
  maxRoundExclusive?: number,
) {
  const where =
    maxRoundExclusive != null
      ? and(
          eq(matches.section, section),
          lt(matches.roundNumber, maxRoundExclusive),
        )
      : eq(matches.section, section);
  return db.select().from(matches).where(where);
}

/**
 * The teams history over rounds `< maxRoundExclusive`, as the round-R draw saw
 * it: matchups played, byes taken, and triples entered — read from the
 * first-class `matches` table (no triple RE-DETECTION).
 */
export async function getSwissTeamsPriorHistory(
  db: Db,
  section: SectionLetter,
  maxRoundExclusive: number,
): Promise<SwissTeamsPriorHistory> {
  const { playedOpponents, hadBye, hadTriple } = swissTeamsHistory(
    await sectionMatches(db, section, maxRoundExclusive),
  );
  return { playedOpponents, hadBye, hadTriple };
}

/**
 * Read a teams round's committed opponents from the first-class `matches`
 * table: the ordinary head-to-heads, with the round's triple and bye teams set
 * aside, plus the round's triples.
 */
export async function getSwissTeamsCommittedRound(
  db: Db,
  section: SectionLetter,
  roundNumber: number,
): Promise<SwissTeamsCommittedRound> {
  const matchRows = (await sectionMatches(db, section)).filter(
    (m) => m.roundNumber === roundNumber,
  );
  return swissTeamsCommittedRound(matchRows, roundNumber);
}
