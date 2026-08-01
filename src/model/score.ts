import { PlayedContractCode, SpecialBoardOutcome } from "./result";

export type BoardOutcome = PlayedContractCode | SpecialBoardOutcome;

export type ScoringMode = "IMP" | "XIMP" | "MP";

export type ResultType =
  | "PAIR_IMP"
  | "PAIR_XIMP"
  | "PAIR_MP";
