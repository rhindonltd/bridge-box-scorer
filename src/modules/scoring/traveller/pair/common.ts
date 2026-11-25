import { ParticipantsByMode } from "@/model/participants";
import { BoardOutcome } from "@/model/score";

export type PairLine = {
  outcome: BoardOutcome;
} & ParticipantsByMode["PAIR"];
