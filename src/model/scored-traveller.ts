import { BoardOutcome } from "@/model/score-traveller";

import {
  IndividualParticipants,
  PairParticipants,
  TeamParticipants,
} from "@/model/participants";

/* ---------- base line data ---------- */

export interface ScoredTravellerLineBase {
  outcome: BoardOutcome;
  score: number | null;
  lead?: string;
  auction?: string;
  play?: string;
}

/* ---------- scoring fields ---------- */

export interface MatchpointScore {
  nsMatchPoints: number;
  ewMatchPoints: number;
}

export interface CrossImpScore {
  nsCrossImps: number;
  ewCrossImps: number;
}

/* ---------- generic traveller lines ---------- */

export type ScoredTeamTravellerLine<
  TScore extends object = Record<string, never>,
> = ScoredTravellerLineBase & TeamParticipants & TScore;

export type ScoredPairTravellerLine<
  TScore extends object = Record<string, never>,
> = ScoredTravellerLineBase & PairParticipants & TScore;

export type ScoredIndividualTravellerLine<
  TScore extends object = Record<string, never>,
> = ScoredTravellerLineBase & IndividualParticipants & TScore;

/* ---------- base traveller container ---------- */

export interface ScoredTravellerBase<TLine> {
  type: TravellerType;
  board: number;
  section: string;
  lines: TLine[];
}

/* ---------- concrete traveller types ---------- */

export type ScoredPairMPTraveller = ScoredTravellerBase<
  ScoredPairTravellerLine<MatchpointScore>
> & {
  type: "PAIR_MP";
};

export type ScoredPairIMPTraveller = ScoredTravellerBase<
  ScoredPairTravellerLine<CrossImpScore>
> & {
  type: "PAIR_IMP";
};

export type ScoredIndividualMPTraveller = ScoredTravellerBase<
  ScoredIndividualTravellerLine<MatchpointScore>
> & {
  type: "INDIVIDUAL_MP";
};

export type ScoredIndividualIMPTraveller = ScoredTravellerBase<
  ScoredIndividualTravellerLine<CrossImpScore>
> & {
  type: "INDIVIDUAL_IMP";
};

/* ---------- unions ---------- */

export type ScoredTraveller =
  | ScoredPairMPTraveller
  | ScoredPairIMPTraveller
  | ScoredIndividualMPTraveller
  | ScoredIndividualIMPTraveller;

export type TravellerType =
  | "PAIR_MP"
  | "PAIR_IMP"
  | "INDIVIDUAL_MP"
  | "INDIVIDUAL_IMP";
