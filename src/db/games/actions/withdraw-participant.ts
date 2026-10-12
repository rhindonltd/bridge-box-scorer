import "server-only";

import { getDb } from "@/db/games";
import { participants } from "@/db/games/tables/participants";
import { eq } from "drizzle-orm";
import { PairSeat } from "@/model/participants";

/**
 * How a contestant's own score is treated for its UNPLAYED boards (EBU White
 * Book §2.4.5/§2.4.6):
 *   - REMOVE     drop from the ranking entirely (a genuine illness)
 *   - PENALISED  AVE− plus a 0..40% fine on the unplayed boards
 */
export type WithdrawalTreatment = "REMOVE" | "PENALISED";

/** The lifecycle change to apply to a seated contestant (post-start only). */
export type StandingChange =
  | {
      standing: "WITHDRAWN";
      /** The round the contestant withdrew in (coarse context only; the
       * played/unplayed boards are read from the board rows at scoring time). */
      withdrawnInRound: number;
      treatment: WithdrawalTreatment;
      /** 0..40 fine percentage; required for PENALISED, ignored for REMOVE. */
      finePercent?: number;
    }
  | {
      // EBU §2.4.7 late arrival. Carries the SAME treatment/fine as a
      // withdrawal: it only takes effect if the latecomer fails the half-boards
      // retain-standing test (computed from board rows at scoring time); if it
      // played at least half the event's boards it keeps standing and the
      // treatment is moot. `arrivedInRound` is coarse UI context, stored on the
      // same `withdrawnInRound` column.
      standing: "LATE";
      arrivedInRound: number;
      treatment: WithdrawalTreatment;
      /** 0..40 fine percentage; required for PENALISED, ignored for REMOVE. */
      finePercent?: number;
    }
  | { standing: "WITHOUT_STANDING" }
  | { standing: "ACTIVE" };

/**
 * Change the standing of the contestant seated at `seat` (EBU White Book §2.4).
 *
 * Unlike {@link import("./delete-participant").deleteParticipant}, this NEVER
 * deletes rows — a withdrawal/late-arrival is a scored event, so the
 * participant and its board rows must survive (opponents' results against it
 * still count, and the contestant's own unplayed boards are scored per
 * §2.4.5/§2.4.6). It only stamps the lifecycle fields. A `LATE` arrival
 * (§2.4.7) is stored with the same treatment/fine as a withdrawal; whether it
 * actually scores that way is decided at scoring time by the half-boards
 * retain-standing test.
 *
 * For teams the standing lives on the team's home-NS participant row and a
 * withdrawal/late-arrival is always whole-team, so the caller passes that home
 * seat.
 *
 * Returns true when a participant row was updated, false when no pair is seated
 * at `seat`. Clears the withdrawal-specific fields when moving to a standing
 * that does not use them, so the row never carries stale treatment data.
 */
export async function withdrawParticipant(
  gameId: string,
  seat: string,
  change: StandingChange,
): Promise<boolean> {
  const db = await getDb(gameId);

  if (!db) {
    return false;
  }

  const values =
    change.standing === "WITHDRAWN" || change.standing === "LATE"
      ? {
          standing: change.standing,
          // WITHDRAWN stores the round it stopped; LATE the round it arrived —
          // both coarse UI context on the same column (scoring reads the board
          // rows, not this).
          withdrawnInRound:
            change.standing === "WITHDRAWN"
              ? change.withdrawnInRound
              : change.arrivedInRound,
          withdrawalTreatment: change.treatment,
          // A fine only applies to PENALISED; REMOVE clears it.
          withdrawalFinePercent:
            change.treatment === "PENALISED"
              ? clampFinePercent(change.finePercent)
              : null,
        }
      : {
          standing: change.standing,
          withdrawnInRound: null,
          withdrawalTreatment: null,
          withdrawalFinePercent: null,
        };

  const result = await db
    .update(participants)
    .set(values)
    .where(eq(participants.initialSeat, seat as PairSeat))
    .returning({ initialSeat: participants.initialSeat });

  return result.length > 0;
}

/** Clamp a §2.4.5 fine into the White Book's 0..40% range (default 0). */
function clampFinePercent(percent: number | undefined): number {
  if (percent == null || Number.isNaN(percent)) return 0;
  return Math.min(40, Math.max(0, Math.round(percent)));
}
