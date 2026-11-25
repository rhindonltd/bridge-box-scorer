import { getDb, type Db } from "@/db/games";
import { SectionLetter } from "@/model/participants";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import {
  getSwissTeamsPriorHistory,
  getSwissTeamsCommittedRound,
} from "@/db/games/queries/swiss-teams-committed";
import {
  computeSectionLeaderboards,
  computeSectionLeaderboardsAsOf,
} from "@/services/leaderboard-service";
import { getSwissBoardHistory } from "@/db/games/queries/swiss-board-history";
import { getSwissCommittedRound } from "@/db/games/queries/swiss-committed-seating";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { eq } from "drizzle-orm";
import {
  decodeStandingsOrder,
  decodeVpById,
  detectSwissPairsMismatches,
  detectSwissTeamsMismatches,
  pairLeaderboardDecoder,
  ruledMismatches,
  swissPairIdFromParticipant,
  teamLeaderboardDecoder,
  teamTableOf,
  teamsRoundToAssess,
  type PairsRoundReplay,
  type RuledMismatch,
  type SectionMismatchCandidate,
  type SwissPairsDrawSpec,
  type TeamsRoundReplay,
} from "@/modules/swiss";

/**
 * EBU §3.5 mismatch DETECTION for a Swiss section — the adapter.
 *
 * After a retroactive score adjustment on an earlier round, the committed draws
 * of later rounds may no longer match what the corrected standings would have
 * produced. For each already-committed round R (R ≥ 2) this reads what the
 * replay needs — the committed seating, the history of earlier rounds and the
 * corrected standings as of R — and hands it to the swiss module's replay
 * driver, which re-derives the draw and returns the pairs/teams whose opponent
 * changed by more than 5 current VP: the §3.5 candidates a director reviews.
 *
 * It is read-only and never rules: fault and the "valid alternatives" exception
 * are the director's call (they feed the existing `markMismatch` adjustment).
 */

/**
 * The sides already ruled mismatched in a section, so detection doesn't list
 * them again. `idOf` decodes a match's `home`/`opponent` into the stable id a
 * candidate carries (a Swiss pair number, or a team's home table).
 */
async function readRuledMismatches(
  db: Db,
  section: SectionLetter,
  idOf: (participant: string) => number | null,
): Promise<RuledMismatch[]> {
  const rows = await db
    .select({
      roundNumber: matches.roundNumber,
      home: matches.home,
      opponent: matches.opponent,
      boardStart: matches.boardStart,
      boardEnd: matches.boardEnd,
      ruling: matches.ruling,
    })
    .from(matches)
    .where(eq(matches.section, section));
  return ruledMismatches(rows, idOf);
}

/**
 * Detect §3.5 mismatch candidates for one section, routing to the pairs or
 * teams detector by the section's Swiss movement. A non-Swiss section (or a
 * section with no movement) has no mismatches.
 */
export async function detectSectionMismatches(
  gameId: string,
  section: SectionLetter,
): Promise<SectionMismatchCandidate[]> {
  const db = await getDb(gameId);
  if (!db) throw new Error("Game db does not exist");

  const selected = await getSectionMovement(db, section);
  if (!selected) return [];
  if (selected.source === "SWISS") {
    return detectPairsSectionMismatches(gameId, db, section, selected.swiss);
  }
  if (selected.source === "SWISS_TEAMS") {
    return detectTeamsSectionMismatches(
      gameId,
      db,
      section,
      selected.swissTeams,
    );
  }
  return [];
}

/** Read one Swiss PAIRS section's committed rounds and replay them. */
async function detectPairsSectionMismatches(
  gameId: string,
  db: Db,
  section: SectionLetter,
  swiss: SwissPairsDrawSpec & { boardsPerRound: number },
): Promise<SectionMismatchCandidate[]> {
  const { tables } = swiss;
  const decoder = pairLeaderboardDecoder(tables);

  const history = await getSwissBoardHistory(db, section, tables);
  const highestRound = history.highestRound;
  if (highestRound < 2) return [];

  // Current VP (as of now) for the > 5 comparison, from the full leaderboard.
  const nowSections = await computeSectionLeaderboards(db, gameId);
  const vpByPair = decodeVpById(
    nowSections.find((s) => s.section === section),
    decoder,
  );

  const ruled = await readRuledMismatches(db, section, (p) =>
    swissPairIdFromParticipant(p, tables),
  );

  const rounds: PairsRoundReplay[] = [];
  for (let round = 2; round <= highestRound; round++) {
    const committed = await getSwissCommittedRound(db, section, tables, round);
    // Corrected standings as of this round (rounds < round, current values).
    const asOf = await computeSectionLeaderboardsAsOf(db, gameId, round);
    // History the round-R draw consumed (rounds < round).
    const priorHistory = await getSwissBoardHistory(db, section, tables, round);
    rounds.push({
      roundNumber: round,
      standingsAsOf: decodeStandingsOrder(
        asOf.find((s) => s.section === section),
        decoder,
      ),
      priorHistory,
      committed,
    });
  }

  return detectSwissPairsMismatches(section, swiss, rounds, vpByPair, ruled);
}

/** Read one Swiss TEAMS section's committed rounds and replay them. */
async function detectTeamsSectionMismatches(
  gameId: string,
  db: Db,
  section: SectionLetter,
  swissTeams: { teams: number; boardsPerRound: number },
): Promise<SectionMismatchCandidate[]> {
  const highestRound = await highestTeamsRound(db, section);
  if (highestRound < 2) return [];

  const nowSections = await computeSectionLeaderboards(db, gameId);
  const vpByTeam = decodeVpById(
    nowSections.find((s) => s.section === section),
    teamLeaderboardDecoder,
  );

  const ruled = await readRuledMismatches(db, section, teamTableOf);

  const rounds: TeamsRoundReplay[] = [];
  for (let round = 2; round <= highestRound; round++) {
    const committed = await getSwissTeamsCommittedRound(db, section, round);
    // Nothing to assess (no ordinary tables AND no triple): skip the reads.
    if (!teamsRoundToAssess(committed)) continue;

    const asOf = await computeSectionLeaderboardsAsOf(db, gameId, round);
    const prior = await getSwissTeamsPriorHistory(db, section, round);
    rounds.push({
      roundNumber: round,
      standingsAsOf: decodeStandingsOrder(
        asOf.find((s) => s.section === section),
        teamLeaderboardDecoder,
      ),
      prior,
      committed,
    });
  }

  return detectSwissTeamsMismatches(
    section,
    swissTeams,
    rounds,
    vpByTeam,
    ruled,
  );
}

/** The highest round materialized in a teams section (0 when none). */
async function highestTeamsRound(
  db: Db,
  section: SectionLetter,
): Promise<number> {
  const rows = await db
    .select({ roundNumber: boards.roundNumber })
    .from(boards)
    .where(eq(boards.section, section));
  let highest = 0;
  for (const r of rows) highest = Math.max(highest, r.roundNumber);
  return highest;
}
