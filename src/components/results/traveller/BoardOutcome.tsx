import { PlayedContract } from "./PlayedContract";
import { isPlayedContractCode } from "@/model/result";
import { BoardOutcome } from "@/model/score-traveller";

type Props = {
  boardOutcome: BoardOutcome;
};

export function BoardResult({ boardOutcome }: Props) {
  if (isPlayedContractCode(boardOutcome)) {
    return <PlayedContract playedContractCode={boardOutcome} />;
  }

  return <span>{boardOutcome}</span>;
}
