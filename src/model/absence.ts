/**
 * PAIRS withdrawals and late arrivals (design `withdrawals-late-arrivals.md`
 * §11): the absence records and the stored treatment codec. How an absence
 * rewrites a board row is a ruling (`@/modules/rulings`).
 */

/** The director's choice for an absent pair's missed boards. */
export type AbsenceTreatment = "AVERAGE" | "REMOVED";

/**
 * Read a stored treatment as a pairs absence treatment. Null (not yet chosen)
 * is the default AVERAGE; the legacy REMOVE / PENALISED values map to their
 * nearest meaning.
 */
export function normaliseAbsenceTreatment(
  raw: string | null | undefined,
): AbsenceTreatment {
  return raw === "REMOVED" || raw === "REMOVE" ? "REMOVED" : "AVERAGE";
}

/**
 * One absent pair or empty seat, keyed by its BOARD id (the id board rows
 * carry: the occupancy's anchor id, or its seat).
 *
 * - `WITHDRAWN` misses every unplayed board in rounds ≥ `round`.
 * - `LATE` (arrived after the start) missed the boards in rounds < `round`.
 * - `EMPTY` is an expected-late seat nobody has filled yet: it misses every
 *   unplayed board for as long as it stays empty.
 */
export interface Absence {
  kind: "WITHDRAWN" | "LATE" | "EMPTY";
  /** WITHDRAWN: the first round missed. LATE: the arrival round. EMPTY: unused. */
  round: number;
  treatment: AbsenceTreatment;
}

/** Every absence in a game, by board id. */
export type Absences = ReadonlyMap<string, Absence>;
