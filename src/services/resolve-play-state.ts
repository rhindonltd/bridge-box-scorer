import { Db } from "@/db/games";
import { getSchedule } from "@/services/schedule-service";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { findBoardSubmissions } from "@/db/games/queries/find-submissions";
import { reconcileSubmissions } from "@/socket/handlers/game/submit-result/reconcile-submissions";
import { expectedRounds } from "@/model/selected-movement";
import { parseSeat, PairSeat } from "@/model/participants";
import type { ScheduleRound } from "@/services/schedule-service";

/**
 * The player's position WITHIN the round they are currently on. Reconstructed
 * from durable truth (board statuses + pending submissions) so it survives the
 * player leaving the Play screen and returning — unlike the former in-memory
 * play state, which was lost on remount.
 *
 * The position is always the FIRST not-yet-confirmed board of the current
 * round (the flow is strictly sequential — a player cannot start a later board
 * until the earlier one is confirmed), with its sub-state:
 *
 * - `entering`: this seat has not submitted the board yet.
 * - `waitingConfirmation`: this seat has submitted; the table is not yet
 *   reconciled (the other side hasn't submitted, or a mismatch is unresolved
 *   from this seat's point of view — see note below).
 * - `mismatch`: both sides submitted and they disagree. Carries the ns/ew
 *   results oriented exactly as the live mismatch event does.
 * - `roundComplete`: every board of the round is confirmed; the player decides
 *   on Continue what comes next.
 */
export type WithinRoundPosition =
  | { at: "entering"; boardNumber: number }
  | { at: "waitingConfirmation"; boardNumber: number }
  | {
      at: "mismatch";
      boardNumber: number;
      nsBoardNumber: number;
      nsResult: string;
      ewBoardNumber: number;
      ewResult: string;
    }
  | { at: "roundComplete" };

/**
 * The fully server-resolved play state for a seat: identity, the current round
 * (when the player is on one), the within-round position, and the
 * between-rounds verdict. The client renders this directly rather than deriving
 * "what comes next" from a local round count.
 */
export type ResolvedPlayState = {
  assignmentId: string;
  side: "NS" | "EW";
  phase:
    | { kind: "round"; roundIndex: number; position: WithinRoundPosition }
    | { kind: "sitOut"; roundIndex: number }
    | { kind: "awaitingNextRound"; completedRound: number }
    | { kind: "complete" };
  /**
   * The materialized rounds (same shape the play flow already consumes). The
   * client still needs the current round's boards/players/table to play; the
   * `phase.roundIndex` selects which one is current.
   */
  rounds: ScheduleRound[];
};

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

  // The player's current round is the first that isn't a completed PLAYED
  // round. A sit-out round is a resting state the player must acknowledge (the
  // sit-out page), so it counts as current until they move past it — the
  // acknowledgement is a pure client tap with no server record, so a reload
  // mid-bye re-shows the sit-out page (benign, and better than silently
  // skipping it).
  const currentRoundIndex = findCurrentRoundIndex(rounds);

  if (currentRoundIndex === -1) {
    // Every materialized round is done. Either the event is over, or (Swiss)
    // more rounds are expected and the director hasn't drawn the next yet.
    const movement = await getSectionMovement(db, section);
    const expected = expectedRounds(movement);
    const materialized = rounds.length;

    if (expected != null && materialized < expected) {
      return {
        assignmentId,
        side,
        rounds,
        phase: { kind: "awaitingNextRound", completedRound: materialized },
      };
    }

    return { assignmentId, side, rounds, phase: { kind: "complete" } };
  }

  const round = rounds[currentRoundIndex];

  // A sit-out round is a resting page the player confirms (the sit-out page):
  // resolve it as its own phase so a player who reloads mid-bye is shown the
  // sit-out page again rather than silently skipping it.
  if (round.sitOut) {
    return {
      assignmentId,
      side,
      rounds,
      phase: { kind: "sitOut", roundIndex: currentRoundIndex },
    };
  }

  const position = await resolveWithinRound(gameId, section, side, round);

  return {
    assignmentId,
    side,
    rounds,
    phase: { kind: "round", roundIndex: currentRoundIndex, position },
  };
}

/**
 * The index of the round the player is currently on: the first round that is
 * not a completed PLAYED round. A sit-out round is NOT skipped — it is a
 * resting state the player must acknowledge on the sit-out page, so it counts
 * as current until they move past it. A played round counts as done only once
 * every board is confirmed. Returns -1 when every materialized round is a
 * completed played round, i.e. the player is between rounds / at the end.
 */
function findCurrentRoundIndex(rounds: ScheduleRound[]): number {
  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    if (round.sitOut) return i;
    const complete = round.boardStatuses.every((b) => b.status === "CONFIRMED");
    if (!complete) return i;
  }
  return -1;
}

/**
 * Reconstruct THIS seat's position within its current round: the first
 * unconfirmed board, and whether this seat is still entering it, waiting for
 * confirmation, or looking at a mismatch.
 *
 * The sub-state is seat-relative, which is why `side` matters. A pending
 * submission on the table does not by itself mean this seat is waiting — if
 * the OTHER side has submitted but this seat has not, this seat is still
 * `entering` (it must enter its own result). Only once this seat has
 * submitted does it move to `waitingConfirmation` (or `mismatch` once both
 * sides are in and they disagree). This mirrors the live flow, where a player
 * who hasn't yet submitted sees the round/wizard regardless of the other
 * pair's progress.
 */
async function resolveWithinRound(
  gameId: string,
  section: string,
  side: "NS" | "EW",
  round: ScheduleRound,
): Promise<WithinRoundPosition> {
  // The first board of this round that isn't confirmed yet.
  const firstUnconfirmed = round.boardStatuses.find(
    (b) => b.status !== "CONFIRMED",
  );

  // No unconfirmed board → the round is complete (defensive: the caller only
  // reaches here for a round findCurrentRoundIndex deemed incomplete, so there
  // is always an unconfirmed board; this guards the empty-round edge).
  /* v8 ignore next 3 */
  if (!firstUnconfirmed) {
    return { at: "roundComplete" };
  }

  const boardNumber = firstUnconfirmed.boardNumber;

  // The table's pending submissions decide the sub-state. Submissions are
  // keyed by (section, round, table) with one row per side.
  const submissions = await findBoardSubmissions(
    gameId,
    section,
    round.tableNumber!,
    round.roundNumber,
  );

  // Whether THIS seat has submitted its result for the board in play yet.
  const mineSubmitted = submissions.some((s) => s.side === side);

  // This seat hasn't entered its own result yet → it is still entering, even
  // if the opponents have already submitted (they are the ones waiting).
  if (!mineSubmitted) {
    return { at: "entering", boardNumber };
  }

  const outcome = reconcileSubmissions(submissions);

  if (outcome.status === "mismatch") {
    return {
      at: "mismatch",
      boardNumber,
      nsBoardNumber: outcome.ns.boardNumber,
      nsResult: outcome.ns.result ?? "",
      ewBoardNumber: outcome.ew.boardNumber,
      ewResult: outcome.ew.result ?? "",
    };
  }

  // This seat has submitted and there's no mismatch: either the other side
  // hasn't submitted yet, or both agree but the board hasn't been flipped to
  // CONFIRMED yet (a brief window). Either way this seat waits.
  return { at: "waitingConfirmation", boardNumber };
}
