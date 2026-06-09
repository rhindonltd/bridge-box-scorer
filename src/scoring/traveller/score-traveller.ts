import * as PairIMP from "./pair/imp";
import * as PairXIMP from "./pair/x-imp";
import * as PairMP from "./pair/mp";

import * as IndividualIMP from "./individual/imp";
import * as IndividualXIMP from "./individual/x-imp";
import * as IndividualMP from "./individual/mp";

import { Traveller } from "@/model/traveller";

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
    }
  | {
      type: "INDIVIDUAL_IMP";
      board: number;
      lines: ReturnType<typeof IndividualIMP.scoreIMP>;
    }
  | {
      type: "INDIVIDUAL_XIMP";
      board: number;
      lines: ReturnType<typeof IndividualXIMP.scoreXIMP>;
    }
  | {
      type: "INDIVIDUAL_MP";
      board: number;
      lines: ReturnType<typeof IndividualMP.scoreMP>;
    };

export type ScoredTravellerOfType<T extends ScoredTraveller["type"]> = Extract<
  ScoredTraveller,
  { type: T }
>;

export function score(
  traveller: Traveller,
  mode: "IMP" | "XIMP" | "MP",
): ScoredTraveller {
  if (traveller.mode === "PAIR") {
    if (mode === "IMP") {
      return {
        type: "PAIR_IMP",
        board: traveller.board,
        lines: PairIMP.scoreIMP(traveller.board, traveller.lines),
      };
    }

    if (mode === "XIMP") {
      return {
        type: "PAIR_XIMP",
        board: traveller.board,
        lines: PairXIMP.scoreXIMP(traveller.board, traveller.lines),
      };
    }

    return {
      type: "PAIR_MP",
      board: traveller.board,
      lines: PairMP.scoreMP(traveller.board, traveller.lines),
    };
  }

  if (mode === "IMP") {
    return {
      type: "INDIVIDUAL_IMP",
      board: traveller.board,
      lines: IndividualIMP.scoreIMP(traveller.board, traveller.lines),
    };
  }

  if (mode === "XIMP") {
    return {
      type: "INDIVIDUAL_XIMP",
      board: traveller.board,
      lines: IndividualXIMP.scoreXIMP(traveller.board, traveller.lines),
    };
  }

  return {
    type: "INDIVIDUAL_MP",
    board: traveller.board,
    lines: IndividualMP.scoreMP(traveller.board, traveller.lines),
  };
}
