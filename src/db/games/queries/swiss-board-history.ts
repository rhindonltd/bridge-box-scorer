import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { and, eq, lt } from "drizzle-orm";
import { SectionLetter } from "@/model/participants";
import { swissPairsHistory, type SwissBoardHistory } from "@/modules/swiss";

/**
 * Read a section's match and board rows and reduce them to the Swiss history
 * the pairing engine needs (the fold is `swissPairsHistory` in the swiss
 * module).
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

  return swissPairsHistory(matchRows, boardRows, tables);
}
