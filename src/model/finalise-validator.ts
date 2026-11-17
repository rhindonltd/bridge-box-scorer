/**
 * Stable codes for the game problems that stop a director finalising a game.
 * Game problems only: settings (club, BridgeWebs, EBU) and Swiss mismatch
 * review are deliberately NOT part of finalising.
 */
export type FinaliseProblemCode =
  "NOT_STARTED" | "RESULTS_OUTSTANDING" | "ALREADY_FINALISED";

export interface FinaliseProblem {
  code: FinaliseProblemCode;
  message: string;
  /** The section a problem belongs to, for grouping in the UI. */
  section?: string;
}

export interface FinaliseCheckResult {
  canFinalise: boolean;
  problems: FinaliseProblem[];
}
