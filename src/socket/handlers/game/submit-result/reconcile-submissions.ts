import { BoardSubmission } from "@/db/games/tables/submissions";
import { BoardOutcome } from "@/model/score";

/** A submitted result as stored (nullable, matching the submissions table). */
type SubmittedResult = BoardOutcome | null;

/**
 * Outcome of reconciling the two sides' pending submissions for a board.
 *
 *  - `pending`   – fewer than both sides have submitted yet; wait.
 *  - `confirmed` – both sides submitted the same board number and result.
 *  - `mismatch`  – both sides submitted but they disagree.
 *
 * This is the pure dual-side confirmation rule, extracted from the socket
 * handler so it can be unit-tested without a socket/db and so the handler reads
 * as orchestration (store → reconcile → persist/broadcast).
 */
export type Reconciliation =
  | { status: "pending" }
  | { status: "confirmed"; boardNumber: number; result: SubmittedResult }
  | {
      status: "mismatch";
      ns: { boardNumber: number; result: SubmittedResult };
      ew: { boardNumber: number; result: SubmittedResult };
    };

export function reconcileSubmissions(
  submissions: BoardSubmission[],
): Reconciliation {
  // Both sides must have submitted before we can confirm or flag a mismatch.
  if (submissions.length !== 2) {
    return { status: "pending" };
  }

  const ns = submissions.find((s) => s.side === "NS");
  const ew = submissions.find((s) => s.side === "EW");

  if (!ns || !ew) {
    return { status: "pending" };
  }

  const agree = ns.boardNumber === ew.boardNumber && ns.result === ew.result;

  if (agree) {
    return {
      status: "confirmed",
      boardNumber: ns.boardNumber,
      result: ns.result,
    };
  }

  return {
    status: "mismatch",
    ns: { boardNumber: ns.boardNumber, result: ns.result },
    ew: { boardNumber: ew.boardNumber, result: ew.result },
  };
}
