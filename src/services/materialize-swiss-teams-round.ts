import "server-only";

import { getDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { and, eq } from "drizzle-orm";
import { SectionLetter } from "@/model/participants";
import {
  buildSectionRows,
  insertSectionDrafts,
} from "@/services/materialize-movement";
import type { TeamsMatch } from "@/model/teams-match-layout";
import {
  swissTeamsRoundToMaterializable,
  type TeamsTriple,
} from "@/modules/swiss";

/**
 * Append a single Swiss Teams round's boards (and, for round 1, the seat
 * assignments) to a game's database in one transaction. Idempotent per round:
 * if the round already has boards, nothing is written (so a retried draw or
 * start can't duplicate a round). Mirrors {@link materializeSwissRound}.
 */
export async function materializeSwissTeamsRound(
  gameId: string,
  section: SectionLetter,
  roundNumber: number,
  boardsPerRound: number,
  totalRounds: number,
  matches: TeamsMatch[],
  byeTeamId: number | null = null,
  triple: TeamsTriple | null = null,
): Promise<{ written: boolean }> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  const existing = await db
    .select({ n: boards.boardNumber })
    .from(boards)
    .where(
      and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)),
    )
    .limit(1);

  if (existing.length > 0) {
    return { written: false };
  }

  const movement = swissTeamsRoundToMaterializable(
    roundNumber,
    boardsPerRound,
    totalRounds,
    matches,
    byeTeamId,
    triple,
  );

  const { boardRows, matchRows, anchors } = buildSectionRows(section, movement);

  insertSectionDrafts(db, matchRows, boardRows, anchors);

  return { written: true };
}
