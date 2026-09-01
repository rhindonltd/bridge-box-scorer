import * as PairIMP from "@/scoring/traveller/pair/imp";
import * as PairXIMP from "@/scoring/traveller/pair/x-imp";
import * as PairMP from "@/scoring/traveller/pair/mp";

/**
 * Input contract for the overall (leaderboard) aggregators: a per-board scored
 * traveller, discriminated by its per-board scoring `type` with `lines` typed
 * from the matching per-board algorithm. Each overall plugin narrows this to
 * the variant it aggregates (via `ScoredTravellerOfType`).
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
