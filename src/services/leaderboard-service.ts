import "server-only";

import { Db } from "@/db/games";
import { boards, Board } from "@/db/games/tables/boards";
import { matches, type Match } from "@/db/games/tables/matches";
import { findPairs } from "@/db/games/queries/find-pairs";
import { readExpectedLateSeats } from "@/db/games/queries/expected-late-seats";
import { readAbsences } from "@/db/games/queries/absences";
import { readSeatOccupancies } from "@/db/games/queries/seat-occupancy";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getAnySectionMovement } from "@/db/games/queries/get-section-movement";
import { findTeams } from "@/db/games/queries/find-teams";
import type { AssignedPair, AssignedTeam } from "@/model/participants";
import { parseSelectedMovement } from "@/model/selected-movement";
import { classifyEvent } from "@/model/event-format";
import { applyRulings, appliesPairsAbsences } from "@/modules/rulings";
import {
  scoreEvent,
  scoringNeedsMatches,
  scoringNeedsTeams,
  type EventParticipants,
  type EventScore,
  type EventSettings,
  type RuledEvent,
  type SectionStandings,
  type Standings,
} from "@/modules/scoring";

/**
 * The leaderboard adapter: read a game's rows and the director's decisions,
 * apply the rulings, and score the event. The rules live in
 * `@/modules/rulings` and `@/modules/scoring`; this file only does the reads.
 */

/**
 * A seated pair as a leaderboard participant. Its id is the id its boards are
 * recorded under (`anchorId ?? seat`) — the same id every scored line, standing
 * and exclusion is keyed on — so a line finds its pair's names. For a
 * direction-qualified movement (Mitchell) that is the seat itself; a movement
 * that numbers pairs (a Howell, a Swiss event) records a bare number instead.
 */
function toParticipant(
  p: Awaited<ReturnType<typeof findPairs>>[number],
): AssignedPair {
  return { ...p, type: "PAIR" as const, id: p.anchorId ?? p.initialSeat };
}

/** Read a game's settings, ruled rows and participants in one go. */
async function readLeaderboardInputs(
  db: Db,
  gameId: string,
  asOfRoundExclusive?: number,
): Promise<{
  event: EventSettings;
  ruled: RuledEvent<Board, Match>;
  participants: EventParticipants;
}> {
  const game = await findGameById(gameId);
  // The movement drives event classification (teams VP / Swiss VP / board
  // pooled). It's stored PER SECTION in the games DB, not on the game-index
  // row, so prefer the game-index copy when present but fall back to the
  // section movement — otherwise a Swiss / Swiss Teams game (whose movement
  // only ever lives on the section) misclassifies as a plain board-pooled
  // pairs event, which for a teams IMP_VP game has no scorer and throws.
  const movement =
    parseSelectedMovement(game?.selectedMovement) ??
    (await getAnySectionMovement(db));

  // Single classification point: what scoring format this game runs under and,
  // for Swiss Pairs, how its per-round VP is derived.
  const classification = classifyEvent(
    game!.gameType,
    game!.scoringType,
    movement,
  );

  // Teams are derived from the seating; needed for any teams game (VP,
  // aggregate IMP, BAM, or PAB).
  const needsTeams = scoringNeedsTeams(classification);

  // Match rows carry the structure the teams scorers read AND the §3.3.8/§3.5
  // match-level rulings the Swiss Pairs VP scorer applies, so load them for any
  // teams game OR a Swiss Pairs VP (XIMP/MP) game.
  const needsMatches = scoringNeedsMatches(classification);

  const [rawBoardRows, matchRows, pairs, teams, lateSeats, occupancies] =
    await Promise.all([
      db.select().from(boards) as Promise<Board[]>,
      needsMatches
        ? (db.select().from(matches) as Promise<Match[]>)
        : Promise.resolve([] as Match[]),
      findPairs(db),
      needsTeams ? findTeams(db) : Promise.resolve([] as AssignedTeam[]),
      readExpectedLateSeats(db),
      readSeatOccupancies(db),
    ]);

  // Every pre-scoring ruling (handover ids, seat swaps, PAIRS absences,
  // standings, empty expected-late seats, and the §3.5 as-of replay) in the
  // fixed order the leaderboard has always used.
  const ruled = applyRulings({
    classification,
    rows: rawBoardRows,
    matches: matchRows,
    decisions: {
      occupancies,
      absences: appliesPairsAbsences(classification)
        ? await readAbsences(db)
        : new Map(),
      expectedLateSeats: lateSeats,
      seatedSeats: new Set<string>(pairs.map((p) => p.initialSeat)),
    },
    asOfRoundExclusive,
  });

  return {
    event: {
      gameType: game!.gameType,
      scoringType: game!.scoringType,
      movement,
      combinedRanking: game!.combinedRanking,
      // The combined standings pool every section into one field, labelled
      // with the game id.
      combinedLabel: gameId,
    },
    ruled,
    participants: { pairs: pairs.map(toParticipant), teams },
  };
}

/**
 * Read the game's scoring type, board rows and pairs ONCE, then compute both
 * the combined and per-section leaderboards from that single read. This is the
 * entry point to use when both are needed (e.g. the leaderboard snapshot),
 * avoiding the duplicate full-table reads that calling the two `compute*`
 * functions separately would incur.
 */
export async function buildLeaderboards(
  db: Db,
  gameId: string,
): Promise<{
  leaderboard: Standings | null;
  sections: SectionStandings[];
}> {
  const { event, ruled, participants } = await readLeaderboardInputs(
    db,
    gameId,
  );
  const { overall, sections } = scoreEvent(event, ruled, participants);
  return { leaderboard: overall, sections };
}

/**
 * Score the game exactly as {@link buildLeaderboards} does, returning the whole
 * event score: the standings plus each pair's adjusted board scores (for the
 * personal scorecard, which must show the figures its total is built from).
 * Kept separate so the leaderboard payload sent to every screen stays small.
 */
export async function scoreGame(db: Db, gameId: string): Promise<EventScore> {
  const { event, ruled, participants } = await readLeaderboardInputs(
    db,
    gameId,
  );
  return scoreEvent(event, ruled, participants);
}

/**
 * Compute the combined leaderboard: all sections' results for a given board
 * number are pooled into one traveller and scored together, producing a single
 * ranking across the whole game. Reads once and computes only the combined
 * result (for callers that need just it).
 */
export async function computeLeaderboard(
  db: Db,
  gameId: string,
): Promise<Standings> {
  const { event, ruled, participants } = await readLeaderboardInputs(
    db,
    gameId,
  );
  return scoreEvent(event, ruled, participants, { scope: "combined" }).overall!;
}

/**
 * Compute one leaderboard per section. Each section is scored independently:
 * only that section's board rows are pooled, and only that section's
 * participants are returned. Sections are returned in ascending letter order.
 * Reads once and computes only the per-section result.
 */
export async function computeSectionLeaderboards(
  db: Db,
  gameId: string,
): Promise<SectionStandings[]> {
  const { event, ruled, participants } = await readLeaderboardInputs(
    db,
    gameId,
  );
  return scoreEvent(event, ruled, participants, { scope: "sections" }).sections;
}

/**
 * Section leaderboards computed over only the rounds BEFORE `maxRoundExclusive`
 * (i.e. `roundNumber < maxRoundExclusive`), using the CURRENT board values.
 *
 * This reconstructs the "corrected standings as of round R" that EBU §3.5
 * mismatch detection needs: the standings the round-R draw SHOULD have used,
 * were today's (possibly retroactively adjusted) earlier-round scores known at
 * the time. It is NOT draw-time fidelity — it deliberately reflects later
 * adjustments on earlier-round boards, which is exactly the "correct opponents"
 * the §3.5 comparison is against.
 *
 * Neither the §2.4.9 ranking exclusion NOR the §2.4.5/§2.4.6 withdrawer
 * self-credit is applied (the rulings' as-of replay empties both): the draw at
 * the time ranked EVERY seated contestant on their REAL results — withdrawal is
 * a scoring-time concern, not a draw-time one — so applying either here would
 * make the replayed "correct opponents" diverge from the deterministic draw and
 * flag false mismatches. No baseline padding either: the replay must reproduce
 * the exact field that drew the past Swiss round, not the full seated roster.
 */
export async function computeSectionLeaderboardsAsOf(
  db: Db,
  gameId: string,
  maxRoundExclusive: number,
): Promise<SectionStandings[]> {
  const { event, ruled, participants } = await readLeaderboardInputs(
    db,
    gameId,
    maxRoundExclusive,
  );
  return scoreEvent(event, ruled, participants, {
    scope: "sections",
    baseline: false,
  }).sections;
}
