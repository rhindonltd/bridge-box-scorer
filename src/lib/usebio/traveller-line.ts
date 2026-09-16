import { BoardOutcome } from "@/model/score";
import { isPlayedContractCode, parsePlayedContract } from "@/model/result";
import { outcomeToScore } from "@/scoring/traveller/common";
import {
  formatOutcomeForUsebio,
  formatContractCompact,
  formatLeadForUsebio,
} from "./format-contract";
import { Card } from "@/model/common";

/**
 * The USEBIO `TRAVELLER_LINE` fields for one played board result, shared by the
 * Swiss Pairs and Swiss Teams emit paths.
 *
 * Unlike the flat MP_PAIRS `RESULT`, a traveller line for Swiss omits the
 * NS/EW pair numbers (they are carried at the MATCH level). It adds `tricks`
 * (the TOTAL tricks the declaring side took, not over/undertricks) and
 * `playedBy` (the declarer).
 *
 * For non-played outcomes (pass-out, not-played, adjusted) the contract detail
 * fields are blank and `tricks` is empty, mirroring how the pairs `RESULT`
 * blanks those rows. `score` is the contract score (0 for a pass-out, 0 when
 * unknown).
 */
export interface UsebioTravellerLine {
  contract: string;
  /** Declarer seat ("N"/"S"/"E"/"W"), or "" when not a played contract. */
  playedBy: string;
  lead: string;
  /** Total tricks taken by declarer (e.g. 10 for "4S="), or "" when unknown. */
  tricks: string;
  /** Contract score from NS's perspective (USEBIO SCORE). */
  score: string;
}

/**
 * Total tricks the declaring side took for a played contract: the book (6) plus
 * the contract level plus the over/undertrick delta ("=" is 0, "+2" is +2,
 * "-1" is -1). Returns "" for anything that is not a played contract.
 */
export function totalTricksFor(outcome: BoardOutcome): string {
  if (!isPlayedContractCode(outcome)) return "";

  const parsed = parsePlayedContract(outcome);
  const delta = parsed.result === "=" ? 0 : Number(parsed.result);
  return String(6 + parsed.level + delta);
}

/**
 * Build the USEBIO traveller-line fields for one board result.
 *
 * `board` is the board number, needed to score the contract (vulnerability is
 * derived from it). `lead` is the opening lead card (may be null).
 */
export function buildTravellerLine(
  board: number,
  outcome: BoardOutcome,
  lead: Card | null,
): UsebioTravellerLine {
  const score = outcomeToScore(board, outcome);

  return {
    contract: formatContractCompact(outcome),
    playedBy: formatOutcomeForUsebio(outcome).declarer,
    lead: formatLeadForUsebio(lead),
    tricks: totalTricksFor(outcome),
    score: String(score ?? 0),
  };
}
