import { ParticipantsByMode } from "@/model/participants";
import { BoardOutcome } from "@/model/score";

export type IndividualLine = {
  outcome: BoardOutcome;
} & ParticipantsByMode["INDIVIDUAL"];
