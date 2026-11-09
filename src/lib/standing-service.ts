import { getDirectorToken } from "@/lib/director-token";
import { emitWithAck } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";

/**
 * A requested change to a seated contestant's EBU §2.4 lifecycle standing.
 * Discriminated on `standing`:
 *
 *  - WITHDRAWN / LATE carry the round the pair withdrew-in / arrived-in and the
 *    §2.4.5 treatment (REMOVE, or PENALISED with a 0..40 fine percentage).
 *  - WITHOUT_STANDING and ACTIVE carry no extra data.
 *
 * This is a client-safe copy of the server-only union in
 * `@/db/games/actions/withdraw-participant` (which must not be imported into
 * client bundles); keep the two in sync.
 */
export type StandingChange =
  | {
      standing: "WITHDRAWN";
      withdrawnInRound: number;
      treatment: "REMOVE" | "PENALISED";
      finePercent?: number;
    }
  | {
      standing: "LATE";
      arrivedInRound: number;
      treatment: "REMOVE" | "PENALISED";
      finePercent?: number;
    }
  | { standing: "WITHOUT_STANDING" }
  | { standing: "ACTIVE" };

/**
 * Director-only standing/expected-late mutations over Socket.IO. The director
 * token travels in the payload; the server re-broadcasts the participant list
 * (and a fresh leaderboard snapshot) so the live view reconciles. Both reject
 * with the server's error message on failure so callers can surface it.
 */

/** Set a seated contestant's EBU §2.4 standing. */
export async function setParticipantStanding(
  gameId: string,
  seat: string,
  change: StandingChange,
): Promise<void> {
  await emitWithAck(SocketEvents.SET_PARTICIPANT_STANDING, {
    gameId,
    directorToken: getDirectorToken(gameId),
    seat,
    change,
  });
}

/** Mark/unmark an EMPTY seat as "expected late" (§2.4.7). */
export async function setSeatExpectedLate(
  gameId: string,
  seat: string,
  expectedLate: boolean,
): Promise<void> {
  await emitWithAck(SocketEvents.SET_SEAT_EXPECTED_LATE, {
    gameId,
    directorToken: getDirectorToken(gameId),
    seat,
    expectedLate,
  });
}
