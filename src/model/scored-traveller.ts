import { BoardOutcome } from "@/model/score-traveller";
import { ParticipantsByMode, TravellerParticipantMode } from "./participants";

/* ---------- base line data ---------- */

export interface ScoredTravellerLineBase {
  outcome: BoardOutcome;
  score: number | null;
  lead?: string;
  auction?: string;
  play?: string;
}

/* ---------- scoring fields ---------- */

export interface ImpTravellerScore {
  nsImps: number;
  ewImps: number;
}

export interface MatchpointTravellerScore {
  maxMatchPoints: number;
  nsMatchPoints: number;
  ewMatchPoints: number;
}

export interface CrossImpTravellerScore {
  nsCrossImps: number;
  ewCrossImps: number;
}

/* ---------- mode & score mapping ---------- */

interface TravellerScoreByMode {
  INDIVIDUAL: {
    IMP: ImpTravellerScore;
    MP: MatchpointTravellerScore;
    XIMP: CrossImpTravellerScore;
  };
  PAIR: {
    IMP: ImpTravellerScore;
    MP: MatchpointTravellerScore;
    XIMP: CrossImpTravellerScore;
  };
}

export type TravellerScoring<M extends TravellerParticipantMode> = Extract<
  keyof TravellerScoreByMode[M],
  string
>;

export type ScoredTravellerType<
  M extends TravellerParticipantMode,
  S extends TravellerScoring<M>,
> = `${M}_${S}`;

/* ---------- helper to infer mode & scoring from type ---------- */

type ModeFromType<T extends string> = T extends `${infer M}_${string}`
  ? M
  : never;
type ScoringFromType<T extends string> = T extends `${string}_${infer S}`
  ? S
  : never;

type ValidModeFromType<T extends ScoredTravellerType<any, any>> = Extract<
  ModeFromType<T>,
  TravellerParticipantMode
>;
type ValidScoringFromType<
  T extends ScoredTravellerType<any, any>,
  M extends TravellerParticipantMode = ValidModeFromType<T>,
> = Extract<ScoringFromType<T>, TravellerScoring<M>>;

/* ---------- line ---------- */

export type ScoredTravellerLine<
  M extends TravellerParticipantMode,
  S extends TravellerScoring<M>,
> = ScoredTravellerLineBase &
  ParticipantsByMode[M] &
  TravellerScoreByMode[M][S];

export type IndividualIMPScoredTravellerLine = ScoredTravellerLine<
  "INDIVIDUAL",
  "IMP"
>;
export type IndividualMatchpointScoredTravellerLine = ScoredTravellerLine<
  "INDIVIDUAL",
  "MP"
>;
export type IndividualXIMPScoredTravellerLine = ScoredTravellerLine<
  "INDIVIDUAL",
  "XIMP"
>;

export type PairIMPScoredTravellerLine = ScoredTravellerLine<"PAIR", "IMP">;
export type PairMatchpointScoredTravellerLine = ScoredTravellerLine<
  "PAIR",
  "MP"
>;
export type PairXIMPScoredTravellerLine = ScoredTravellerLine<"PAIR", "XIMP">;

/* ---------- container ---------- */

export interface ScoredTravellerBaseFromType<
  T extends ScoredTravellerType<any, any>,
> {
  type: T;
  board: number;
  lines: ScoredTravellerLine<ValidModeFromType<T>, ValidScoringFromType<T>>[];
}

/* ---------- union ---------- */

export type IndividualIMPScoredTraveller =
  ScoredTravellerBaseFromType<"INDIVIDUAL_IMP">;
export type IndividualMatchpointScoredTraveller =
  ScoredTravellerBaseFromType<"INDIVIDUAL_MP">;
export type IndividualXIMPScoredTraveller =
  ScoredTravellerBaseFromType<"INDIVIDUAL_XIMP">;

export type PairIMPScoredTraveller = ScoredTravellerBaseFromType<"PAIR_IMP">;
export type PairMatchpointScoredTraveller =
  ScoredTravellerBaseFromType<"PAIR_MP">;
export type PairXIMPScoredTraveller = ScoredTravellerBaseFromType<"PAIR_XIMP">;

export type ScoredTraveller =
  | IndividualIMPScoredTraveller
  | IndividualMatchpointScoredTraveller
  | IndividualXIMPScoredTraveller
  | PairIMPScoredTraveller
  | PairMatchpointScoredTraveller
  | PairXIMPScoredTraveller;

export type AnyScoredTravellerType = ScoredTravellerType<
  TravellerParticipantMode,
  "MP" | "IMP" | "XIMP"
>;
