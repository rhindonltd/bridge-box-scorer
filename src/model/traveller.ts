import {
  TravellerParticipantMode,
  ParticipantsByMode,
} from "@/model/participants";
import { BoardOutcome } from "./score";

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

/* ---------- concrete helpers ---------- */

export type PairTraveller = TravellerBase<"PAIR">;

/* ---------- unions ---------- */

export type Traveller = PairTraveller;

export type AnyTravellerType = TravellerType<TravellerParticipantMode>;
