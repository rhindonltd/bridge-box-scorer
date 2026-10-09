import { Db } from "@/db/games";
import { participants } from "@/db/games/tables/participants";

/**
 * EBU White Book §2.4.9 "without standing" — the set of participant ids whose
 * results count for their opponents but who are themselves dropped from the
 * ranking.
 *
 * A contestant is excluded from the ranking when:
 *   - `standing = WITHOUT_STANDING` (a stand-by / substitute, §2.4.9); or
 *   - `standing = WITHDRAWN` and the director chose `REMOVE` (a genuine
 *     illness, §2.4.5).
 *
 * A `PENALISED` withdrawal still appears in the ranking (with its penalised
 * score), so it is NOT in this set. Keyed on `initialSeat` — the same id a pair
 * line (`pairId`) and a team line (`teamId`, the home-NS seat) carry — so the
 * set applies uniformly to the live leaderboard and the USEBIO export, which
 * must agree.
 */
export async function readRankingExclusions(db: Db): Promise<Set<string>> {
  const rows = await db
    .select({
      initialSeat: participants.initialSeat,
      standing: participants.standing,
      withdrawalTreatment: participants.withdrawalTreatment,
    })
    .from(participants);

  const excluded = new Set<string>();
  for (const r of rows) {
    if (
      r.standing === "WITHOUT_STANDING" ||
      (r.standing === "WITHDRAWN" && r.withdrawalTreatment === "REMOVE")
    ) {
      excluded.add(r.initialSeat);
    }
  }
  return excluded;
}

/**
 * A withdrawn pair, for the §2.4.3–§2.4.6 scoring passes. Carries BOTH the
 * self-credit facts (treatment + fine, for the withdrawer's own §2.4.5 score)
 * and enough to drive the opponents' §2.4.4 indemnity — which applies to EVERY
 * withdrawer (REMOVE and PENALISED alike), because an opponent's lost boards
 * are indemnified regardless of how the withdrawer itself is scored.
 */
export interface WithdrawalRecord {
  seat: string;
  /** §2.4.5 treatment chosen by the director. */
  treatment: "REMOVE" | "PENALISED";
  /** The 0..40% fine (0 for REMOVE / unset). */
  finePercent: number;
}

/** Read all WITHDRAWN pairs (seat + treatment + fine) for a game. */
export async function readWithdrawals(db: Db): Promise<WithdrawalRecord[]> {
  const rows = await db
    .select({
      initialSeat: participants.initialSeat,
      standing: participants.standing,
      withdrawalTreatment: participants.withdrawalTreatment,
      withdrawalFinePercent: participants.withdrawalFinePercent,
    })
    .from(participants);

  const out: WithdrawalRecord[] = [];
  for (const r of rows) {
    if (r.standing !== "WITHDRAWN") continue;
    // A withdrawal with no recorded treatment defaults to REMOVE (dropped from
    // the ranking; opponents still indemnified), the safe conservative choice.
    const treatment = r.withdrawalTreatment ?? "REMOVE";
    out.push({
      seat: r.initialSeat,
      treatment,
      finePercent: treatment === "PENALISED" ? r.withdrawalFinePercent ?? 0 : 0,
    });
  }
  return out;
}
