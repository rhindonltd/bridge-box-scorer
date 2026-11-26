import { BoardOutcome } from "@/model/score";
import type { Card } from "@/model/common";

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
  | {
      status: "confirmed";
      boardNumber: number;
      result: SubmittedResult;
      lead: Card | null;
    }
  | {
      status: "mismatch";
      ns: { boardNumber: number; result: SubmittedResult; lead: Card | null };
      ew: { boardNumber: number; result: SubmittedResult; lead: Card | null };
    };

/** One side's pending submission for a board (a `board_submissions` row). */
export interface PendingSubmission {
  side: "NS" | "EW";
  boardNumber: number;
  result: SubmittedResult;
  lead: Card | null;
}

export function reconcileSubmissions(
  submissions: readonly PendingSubmission[],
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

  // The opening lead must also match (a missing lead matches only a missing
  // lead).
  const agree =
    ns.boardNumber === ew.boardNumber &&
    ns.result === ew.result &&
    (ns.lead ?? null) === (ew.lead ?? null);

  if (agree) {
    return {
      status: "confirmed",
      boardNumber: ns.boardNumber,
      result: ns.result,
      lead: ns.lead ?? null,
    };
  }

  return {
    status: "mismatch",
    ns: {
      boardNumber: ns.boardNumber,
      result: ns.result,
      lead: ns.lead ?? null,
    },
    ew: {
      boardNumber: ew.boardNumber,
      result: ew.result,
      lead: ew.lead ?? null,
    },
  };
}
