import { BoardOutcome } from "@/model/score-traveller";
import {
  TravellerIndividualParticipants,
  TravellerPairParticipants,
} from "@/model/participants";

/* ---------- base line data ---------- */

export interface TravellerLineBase {
  outcome: BoardOutcome;
  lead?: string;
  auction?: string;
  play?: string;
}

/* ---------- generic traveller lines ---------- */

export type PairTravellerLine = TravellerLineBase & TravellerPairParticipants;

export type IndividualTravellerLine = TravellerLineBase &
  TravellerIndividualParticipants;

/* ---------- base traveller container ---------- */

export interface TravellerBase<TLine> {
  type: TravellerType;
  board: number;
  section: string;
  lines: TLine[];
}

/* ---------- concrete traveller types ---------- */

export type PairMPTraveller = TravellerBase<PairTravellerLine> & {
  type: "PAIR_MP";
};

export type PairIMPTraveller = TravellerBase<PairTravellerLine> & {
  type: "PAIR_IMP";
};

export type IndividualMPTraveller = TravellerBase<IndividualTravellerLine> & {
  type: "INDIVIDUAL_MP";
};

export type IndividualIMPTraveller = TravellerBase<IndividualTravellerLine> & {
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
