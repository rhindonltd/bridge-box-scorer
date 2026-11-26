import "server-only";

import { and, eq } from "drizzle-orm";
import { type Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { type SectionLetter } from "@/model/participants";
import { isSwissRoundFinal, type RoundCompletionPolicy } from "@/modules/swiss";

/**
 * Whether a round is safe to draw the NEXT round from. Reads the round's
 * boards, each joined to its match so a match-level void / mismatch ruling is
 * seen, and applies the swiss module's rule (`isSwissRoundFinal`) under the
 * pairs or teams policy (`PAIRS_ROUND_COMPLETION` / `TEAMS_ROUND_COMPLETION`).
 */
export async function isSwissRoundComplete(
  db: Db,
  section: SectionLetter,
  roundNumber: number,
  policy: RoundCompletionPolicy,
): Promise<boolean> {
  const rows = await db
    .select({ status: boards.status, ruling: matches.ruling })
    .from(boards)
    .innerJoin(matches, eq(boards.matchId, matches.id))
    .where(
      and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)),
    );
  return isSwissRoundFinal(rows, policy);
}
