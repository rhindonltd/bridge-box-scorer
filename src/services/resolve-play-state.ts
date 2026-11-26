import { Db } from "@/db/games";
import { getSchedule } from "@/services/schedule-service";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { findBoardSubmissions } from "@/db/games/queries/find-submissions";
import { expectedRounds } from "@/model/selected-movement";
import { parseSeat, PairSeat } from "@/model/participants";
import { resolvePlayPhase, type ResolvedPlayState } from "@/modules/play-flow";

/**
 * Resolve everything a seated player should see, from server truth.
 *
 * Builds on {@link getSchedule} (which assembles the materialized rounds,
 * players, statuses, sit-outs and half-matches) and adds the two things the
 * raw schedule cannot express:
 *
 * 1. The within-round position, reconstructed from this table's pending
 *    submissions (`board_submissions`) reconciled with the same rule the live
 *    submit flow uses, so a returning player lands back on exactly the board
 *    and sub-state they left.
 * 2. The between-rounds verdict: when the last materialized round is complete,
 *    distinguish "more rounds are expected but not drawn yet" (Swiss, awaiting
 *    the director's draw) from "the event is genuinely over", using the
 *    section movement's configured round count.
 *
 * Returns null when the seat has no assignment yet (game not started / no
 * movement), mirroring `getSchedule` so the route still 404s in that case.
 */
export async function resolvePlayState(
  db: Db,
  gameId: string,
  seat: string,
): Promise<ResolvedPlayState | null> {
  const schedule = await getSchedule(db, seat);
  if (!schedule) return null;

  const { assignmentId, side, rounds } = schedule;
  const { section } = parseSeat(seat as PairSeat);

  // A seated pair whose game has not been started yet has an occupancy row
  // (so `getSchedule` returns non-null) but no materialized boards, hence no
  // rounds. That is the "seated, waiting for the director to start" state, not
  // a finished event — return null so the route 404s and the client shows the
  // WaitingToStartPage. Without this guard an empty round list falls through to
  // `findCurrentRoundIndex` returning -1 and the resolver reports `complete`,
  // sending a freshly-seated player straight to the Game Complete screen.
  if (rounds.length === 0) return null;

  // The phase (current round, resting rounds, within-round position) is
  // worked out by `resolvePlayPhase`; this only supplies its reads.
  const phase = await resolvePlayPhase(rounds, side, {
    expectedRounds: async () =>
      expectedRounds(await getSectionMovement(db, section)),
    submissions: (round) =>
      findBoardSubmissions(
        gameId,
        section,
        round.tableNumber!,
        round.roundNumber,
      ),
  });

  return { assignmentId, side, rounds, phase };
}
