import "server-only";

import { eq, or } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { PairSeat } from "@/model/participants";
import { buildAssignmentPlayerLookup } from "@/db/games/queries/assignment-players";
import {
  buildScheduleRounds,
  scoreBreakRounds,
  teamOfPair,
  type PairBoardRow,
} from "@/modules/play-flow";
import { readExpectedLateSeats } from "@/db/games/queries/expected-late-seats";
import { readTeamMatchRounds } from "@/db/games/queries/team-match-rounds";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { declaredScoreBreakRounds } from "@/modules/movement-catalog";
import { sectionOf } from "@/model/participants";

/**
 * Build a player schedule for a single seat: which boards this pair plays in
 * which round, at which table, against whom, plus sit-out rounds padded in.
 *
 * The DB reads run in a fixed order (assignment lookup → this pair's boards →
 * the game-wide player lookup → expected-late seats → total rounds → the teams
 * match rounds → the section's movement); the rounds are then built by
 * `buildScheduleRounds` (`@/modules/play-flow`). In a teams game each round is
 * flagged when the pair's team scores up after it; a pairs game has no teams
 * matches and declares no score breaks, so none.
 */
export async function getSchedule(db: Db, seat: string) {
  const anchorId = await seatAnchorId(db, seat);
  if (anchorId == null) {
    return null;
  }

  // A board row's ns/ew carries the seat's ANCHOR id (equal to the seat for
  // direction-qualified movements, a bare id otherwise), so the schedule joins
  // on the anchor id.
  const assignmentId = anchorId;
  // The pair's side for submission is based on the initialSeat suffix.
  const side: "NS" | "EW" = seat.endsWith("NS") ? "NS" : "EW";

  const pairBoards = (await findPairBoards(db, assignmentId)) as PairBoardRow[];

  // Game-wide lookup from an assignment id to the two players sitting there.
  const assignmentToPlayers = await buildAssignmentPlayerLookup(db);

  // §2.4.7: the empty seats a director marked "expected late", so a round whose
  // opponent is one of them is shown as "running late" rather than a blank
  // table or a sit-out.
  const expectedLateSeats = await readExpectedLateSeats(db);

  const totalRounds = await countTotalRounds(db);
  // A team scores up where its matches so far are finished, and wherever its
  // movement calls a score-up mid-match (a head-to-head's stanzas).
  const scoreBreaks = new Set([
    ...scoreBreakRounds(
      await readTeamMatchRounds(db),
      teamOfPair(assignmentId),
    ),
    ...declaredScoreBreakRounds(await getSectionMovement(db, sectionOf(seat))),
  ]);

  return {
    assignmentId,
    side,
    rounds: buildScheduleRounds({
      pairBoards,
      players: assignmentToPlayers,
      assignmentId,
      expectedLateSeats,
      totalRounds,
      scoreBreakRounds: scoreBreaks,
    }),
  };
}

// --- DB reads (kept in a fixed call order the tests rely on) -------------

/**
 * The board id (anchor) for a seat's occupancy, or null when the seat is still
 * empty. Falls back to the seat itself when the anchor has not been stamped
 * (the id equals the seat for direction-qualified movements, and a game may not
 * have been materialised yet).
 */
async function seatAnchorId(db: Db, seat: string): Promise<string | null> {
  const row = await db
    .select({ seat: seatOccupancy.seat, anchorId: seatOccupancy.anchorId })
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat as PairSeat))
    .get();
  if (row == null) return null;
  return row.anchorId ?? row.seat;
}

/** All board rows in which this pair appears as NS or EW. */
function findPairBoards(db: Db, assignmentId: string) {
  return db
    .select()
    .from(pairsBoards)
    .where(
      or(eq(pairsBoards.ns, assignmentId), eq(pairsBoards.ew, assignmentId)),
    );
}

/** Total rounds in the game, from ALL boards (not just this pair's). */
async function countTotalRounds(db: Db): Promise<number> {
  const allGameBoards = await db
    .select({ roundNumber: pairsBoards.roundNumber })
    .from(pairsBoards);
  const allRoundNumbers = new Set(allGameBoards.map((b) => b.roundNumber));
  return allRoundNumbers.size > 0 ? Math.max(...allRoundNumbers) : 0;
}
