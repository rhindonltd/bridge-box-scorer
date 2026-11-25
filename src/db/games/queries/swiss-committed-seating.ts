import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { and, eq } from "drizzle-orm";
import { SectionLetter } from "@/model/participants";
import {
  committedRoundNeedsBoards,
  swissCommittedRound,
  type SwissCommittedRound,
} from "@/modules/swiss";

/**
 * Read the committed seating for one round of a Swiss section: its `matches`
 * rows and, when it has an ordinary head-to-head, its board rows (for the table
 * numbers). The fold is `swissCommittedRound` in the swiss module.
 */
export async function getSwissCommittedRound(
  db: Db,
  section: SectionLetter,
  tables: number,
  roundNumber: number,
): Promise<SwissCommittedRound> {
  const matchRows = await db
    .select()
    .from(matches)
    .where(
      and(eq(matches.section, section), eq(matches.roundNumber, roundNumber)),
    );

  const boardRows = committedRoundNeedsBoards(matchRows)
    ? await db
        .select({ tableNumber: boards.tableNumber, ns: boards.ns })
        .from(boards)
        .where(
          and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)),
        )
    : [];

  return swissCommittedRound(matchRows, boardRows, tables, roundNumber);
}
