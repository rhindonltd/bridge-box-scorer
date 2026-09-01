import * as PairIMP from "@/scoring/traveller/pair/imp";
import * as PairXIMP from "@/scoring/traveller/pair/x-imp";
import * as PairMP from "@/scoring/traveller/pair/mp";

/**
 * Transitional types for the overall aggregators, which still consume the
 * old discriminated `ScoredTraveller` shape (`{ type, board, lines }`). These
 * are removed once the overall side is fully migrated to plugins (Task 7).
 */
export type ScoredTraveller =
  | {
      type: "PAIR_IMP";
      board: number;
      lines: ReturnType<typeof PairIMP.scoreIMP>;
    }
  | {
      type: "PAIR_XIMP";
      board: number;
      lines: ReturnType<typeof PairXIMP.scoreXIMP>;
    }
  | {
      type: "PAIR_MP";
      board: number;
      lines: ReturnType<typeof PairMP.scoreMP>;
    };

export type ScoredTravellerOfType<T extends ScoredTraveller["type"]> = Extract<
  ScoredTraveller,
  { type: T }
>;
