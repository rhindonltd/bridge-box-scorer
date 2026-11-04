import "server-only";

import { getDb } from "@/db/games";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { eq } from "drizzle-orm";
import { PairSeat } from "@/model/participants";

/** One occupant's eligibility choice: its id + whether it counts for the ranking. */
export interface OccupantEligibility {
  /** The occupancy's surrogate id. */
  id: number;
  /** true ⇒ ACTIVE (ranked); false ⇒ WITHOUT_STANDING (unranked, counts for opponents). */
  eligible: boolean;
}

export interface SubstitutionOptions {
  /**
   * Whether the seat scores as TWO separate lines (`true`) or ONE merged line
   * (`false`). Written to `split` on BOTH of the seat's occupancies.
   */
  split: boolean;
  /** Per-occupant eligibility (sets each occupancy's `standing`). */
  eligibility: OccupantEligibility[];
  /**
   * The occupancy id of the "main pair" — whose name + EBU record represents
   * the ONE merged line (ranking + USEBIO `<PAIR>`); the other occupant becomes
   * the local "(Sub)" line. Only meaningful for a merged seat (`split = false`);
   * ignored (cleared) when `split = true`, where each occupant is its own line.
   * Omit to leave the current choice untouched.
   */
  mainOccupancyId?: number;
}

/**
 * Set a §2.4.7 handover seat's Substitutions options — the director's two
 * toggles: "Split by board?" (per seat) and "Eligible for local ranking?" (per
 * occupant). This replaces the legacy handover-treatment write: a substitution
 * has no artificial score, so there is no REMOVE/PENALISED/fine — eligibility is
 * expressed purely as `standing` (ACTIVE vs WITHOUT_STANDING) and the line count
 * purely as `split`.
 *
 * In one transaction:
 *   - `split` is written to EVERY occupancy of the seat (it is a per-seat fact
 *     carried redundantly on each row);
 *   - each occupant named in `eligibility` has its `standing` set to ACTIVE
 *     (eligible) or WITHOUT_STANDING (not). Only occupancies that belong to the
 *     given seat are touched (the id is validated against the seat's rows), so a
 *     stray id can never clobber another seat.
 *
 * Returns true when the seat had occupancies to update, false when no pair is
 * seated there (a 404 for the route).
 */
export async function setSubstitutionOptions(
  gameId: string,
  seat: string,
  options: SubstitutionOptions,
): Promise<boolean> {
  const db = await getDb(gameId);
  if (!db) return false;

  const rows = await db
    .select({ id: seatOccupancy.id })
    .from(seatOccupancy)
    .where(eq(seatOccupancy.seat, seat as PairSeat))
    .all();

  if (rows.length === 0) return false;

  const seatIds = new Set(rows.map((r) => r.id));
  const splitValue = options.split ? 1 : 0;

  db.transaction((tx) => {
    // `split` is a per-seat fact — write it to every occupancy of the seat.
    tx.update(seatOccupancy)
      .set({ split: splitValue })
      .where(eq(seatOccupancy.seat, seat as PairSeat))
      .run();

    // Per-occupant eligibility, keyed by occupancy id. Ignore any id that is
    // not one of this seat's occupancies (defensive against a stale/forged id).
    for (const { id, eligible } of options.eligibility) {
      if (!seatIds.has(id)) continue;
      tx.update(seatOccupancy)
        .set({ standing: eligible ? "ACTIVE" : "WITHOUT_STANDING" })
        .where(eq(seatOccupancy.id, id))
        .run();
    }

    // The MAIN pair (merged-line identity) only applies to a merged seat. When
    // the seat is SPLIT, each occupant is its own line, so there is no main
    // pair — clear the flag on both. When merged and a valid id is given, set
    // it on exactly that occupant and clear it on the other(s).
    if (options.split) {
      tx.update(seatOccupancy)
        .set({ isMainLine: 0 })
        .where(eq(seatOccupancy.seat, seat as PairSeat))
        .run();
    } else if (
      options.mainOccupancyId != null &&
      seatIds.has(options.mainOccupancyId)
    ) {
      const mainId = options.mainOccupancyId;
      for (const id of seatIds) {
        tx.update(seatOccupancy)
          .set({ isMainLine: id === mainId ? 1 : 0 })
          .where(eq(seatOccupancy.id, id))
          .run();
      }
    }
  });

  return true;
}
