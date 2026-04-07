import { BoardOutcome } from "@/model/score-traveller";
import {
  TravellerParticipantMode,
  ParticipantsByMode,
} from "@/model/participants";

export interface TravellerLineBase {
  outcome: BoardOutcome;
  lead?: string;
  auction?: string;
  play?: string;
}

/* ---------- generic traveller line ---------- */

export type TravellerLine<M extends TravellerParticipantMode> =
  TravellerLineBase & ParticipantsByMode[M];

/* ---------- traveller type helper ---------- */

export type TravellerType<M extends TravellerParticipantMode> = `${M}`;

/* ---------- base traveller container ---------- */

export interface TravellerBase<M extends TravellerParticipantMode> {
  type: TravellerType<M>;
  mode: M;
  board: number;
  section: string;
  lines: TravellerLine<M>[];
}

/* ---------- concrete helpers (optional) ---------- */

export type PairTraveller = TravellerBase<"PAIR">;
export type IndividualTraveller = TravellerBase<"INDIVIDUAL">;

/* ---------- unions ---------- */

export type Traveller = PairTraveller | IndividualTraveller;

export type AnyTravellerType = TravellerType<TravellerParticipantMode>;
