import { BoardOutcome } from "@/model/score";
import { isPlayedContractCode, parsePlayedContract } from "@/model/result";

/**
 * USEBIO suit names: "S", "H", "D", "C", "NT"
 * USEBIO contract format: "4 S", "3 NT", "6 H x" (space-separated, x/xx suffix for doubles)
 */

const SUIT_NAMES: Record<string, string> = {
  S: "S",
  H: "H",
  D: "D",
  C: "C",
  NT: "NT",
};

export type UsebioResult = {
  /** Contract in USEBIO format: "4 S", "3 NT x", "PASS" */
  contract: string;
  /** Declarer: "N", "S", "E", "W" or "" for pass-out */
  declarer: string;
  /** Result: "=", "+2", "-1", or "" for pass-out/not-played/adjusted */
  result: string;
};

const ADJUSTED_REGEX = /^A(\d+)\/(\d+)$/;

/**
 * Returns true if the outcome is an adjusted score in A<ns>/<ew> format.
 */
export function isAdjustedScore(outcome: string): boolean {
  return ADJUSTED_REGEX.test(outcome);
}

/**
 * Parses an adjusted score string (e.g., "A60/40") into NS and EW percentages.
 */
export function parseAdjustedScore(
  outcome: string,
): { ns: number; ew: number } | null {
  const match = outcome.match(ADJUSTED_REGEX);
  if (!match) return null;
  return { ns: Number(match[1]), ew: Number(match[2]) };
}

/**
 * Converts our internal BoardOutcome format to USEBIO result fields.
 *
 * Internal format examples:
 *   "1NTN="     → { contract: "1 NT", declarer: "N", result: "=" }
 *   "4SXS+2"   → { contract: "4 S x", declarer: "S", result: "+2" }
 *   "3HXXE-1"  → { contract: "3 H xx", declarer: "E", result: "-1" }
 *   "PO"       → { contract: "PASS", declarer: "", result: "" }
 *   "NP"       → { contract: "", declarer: "", result: "" }
 *   "A60/40"   → { contract: "", declarer: "", result: "" }  (adjusted score)
 */
export function formatOutcomeForUsebio(outcome: BoardOutcome): UsebioResult {
  if (outcome === "PO") {
    return { contract: "PASS", declarer: "", result: "" };
  }

  if (outcome === "NP") {
    return { contract: "", declarer: "", result: "" };
  }

  if (isAdjustedScore(outcome)) {
    return { contract: "", declarer: "", result: "" };
  }

  if (!isPlayedContractCode(outcome)) {
    return { contract: "", declarer: "", result: "" };
  }

  const parsed = parsePlayedContract(outcome);

  /* v8 ignore next -- parsePlayedContract only yields the known suits S/H/D/C/NT,
     all present in SUIT_NAMES, so the `?? parsed.suit` fallback is unreachable. */
  const suitName = SUIT_NAMES[parsed.suit] ?? parsed.suit;
  let contract = `${parsed.level} ${suitName}`;

  if (parsed.doubling === "X") {
    contract += " x";
  } else if (parsed.doubling === "XX") {
    contract += " xx";
  }

  return {
    contract,
    declarer: parsed.declarer,
    result: parsed.result,
  };
}

/**
 * Formats a lead card from internal format (e.g., "SA", "HT", "C2")
 * to USEBIO format. Internal Card type is already Suit+Rank (e.g., "SA" = Spade Ace)
 * which matches USEBIO format, so no transformation needed.
 */
export function formatLeadForUsebio(lead: string | null): string {
  if (!lead || lead.length < 2) return "";
  return lead;
}
