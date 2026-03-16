import { BoardOutcome } from "@/model/score-traveller";
import {
  IndividualParticipants,
  PairParticipants,
  TeamParticipants,
} from "@/model/participants";

/* ---------- base line data ---------- */

export interface TravellerLineBase {
  outcome: BoardOutcome;
  lead?: string;
  auction?: string;
  play?: string;
}

/* ---------- scoring fields ---------- */

export interface MatchpointScore {
  nsMatchPoints: number;
  ewMatchPoints: number;
}

export interface ImpScore {
  nsImps: number;
  ewImps: number;
}

/* ---------- generic traveller lines ---------- */

export type TeamTravellerLine<TScore extends object = Record<string, never>> =
  TravellerLineBase & TeamParticipants & TScore;

export type PairTravellerLine<TScore extends object = Record<string, never>> =
  TravellerLineBase & PairParticipants & TScore;

export type IndividualTravellerLine<
  TScore extends object = Record<string, never>,
> = TravellerLineBase & IndividualParticipants & TScore;

/* ---------- base traveller container ---------- */

export interface TravellerBase<TLine> {
  type: TravellerType;
  board: number;
  section: string;
  lines: TLine[];
}

/* ---------- concrete traveller types ---------- */

export type PairMPTraveller = TravellerBase<
  PairTravellerLine<MatchpointScore>
> & {
  type: "PAIR_MP";
};

export type PairIMPTraveller = TravellerBase<PairTravellerLine<ImpScore>> & {
  type: "PAIR_IMP";
};

export type IndividualMPTraveller = TravellerBase<
  IndividualTravellerLine<MatchpointScore>
> & {
  type: "INDIVIDUAL_MP";
};

export type IndividualIMPTraveller = TravellerBase<
  IndividualTravellerLine<ImpScore>
> & {
  type: "INDIVIDUAL_IMP";
};

/* ---------- unions ---------- */

export type Traveller =
  | PairMPTraveller
  | PairIMPTraveller
  | IndividualMPTraveller
  | IndividualIMPTraveller;

export type TravellerType =
  | "PAIR_MP"
  | "PAIR_IMP"
  | "INDIVIDUAL_MP"
  | "INDIVIDUAL_IMP";
