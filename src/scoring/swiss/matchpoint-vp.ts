/**
 * VP precision for the cross-IMP (WBF) conversion: 2-dp decimals ("continuous")
 * or whole integers ("discrete").
 *
 * Matchpoint Swiss Pairs VP is NOT a continuous curve — it is read from the EBU
 * board-count threshold tables in `mp-vp-table.ts` (always whole integers), so
 * this scale applies only to the cross-IMP (`ximpHalfVp` / `impsToVp`) path.
 */
export type VpScale = "continuous" | "discrete";
