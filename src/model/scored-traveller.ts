import { BoardOutcome } from "@/model/score-traveller";

import {
  TravellerIndividualParticipants,
  TravellerPairParticipants,
  TravellerTeamParticipants,
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

export interface MatchpointTravellerScore {
  maxMatchPoints: number;
  nsMatchPoints: number;
  ewMatchPoints: number;
}

export interface CrossImpTravellerScore {
  nsCrossImps: number;
  ewCrossImps: number;
}

/* ---------- generic traveller lines ---------- */

export type ScoredTeamTravellerLine<
  TScore extends object = Record<string, never>,
> = ScoredTravellerLineBase & TravellerTeamParticipants & TScore;

export type ScoredPairTravellerLine<
  TScore extends object = Record<string, never>,
> = ScoredTravellerLineBase & TravellerPairParticipants & TScore;

export type ScoredIndividualTravellerLine<
  TScore extends object = Record<string, never>,
> = ScoredTravellerLineBase & TravellerIndividualParticipants & TScore;

/* ---------- base traveller container ---------- */

export interface ScoredTravellerBase<TLine> {
  type: TravellerType;
  board: number;
  section: string;
  lines: TLine[];
}

/* ---------- concrete traveller types ---------- */

export type ScoredIndividualMPTraveller = ScoredTravellerBase<
  ScoredIndividualTravellerLine<MatchpointTravellerScore>
> & {
  type: "INDIVIDUAL_MP";
};

export type ScoredIndividualIMPTraveller = ScoredTravellerBase<
  ScoredIndividualTravellerLine<CrossImpTravellerScore>
> & {
  type: "INDIVIDUAL_IMP";
};

export type ScoredPairMPTraveller = ScoredTravellerBase<
  ScoredPairTravellerLine<MatchpointTravellerScore>
> & {
  type: "PAIR_MP";
};

export type ScoredPairIMPTraveller = ScoredTravellerBase<
  ScoredPairTravellerLine<CrossImpTravellerScore>
> & {
  type: "PAIR_IMP";
};

/* ---------- unions ---------- */

export type ScoredTraveller =
  | ScoredIndividualMPTraveller
  | ScoredIndividualIMPTraveller
  | ScoredPairMPTraveller
  | ScoredPairIMPTraveller;

export type TravellerType =
  | "INDIVIDUAL_MP"
  | "INDIVIDUAL_IMP"
  | "PAIR_MP"
  | "PAIR_IMP";
