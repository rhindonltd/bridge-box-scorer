import { BoardOutcome } from "@/model/score";
import { PlayedContract } from "./PlayedContract";
import { isPlayedContractCode } from "@/model/result";

type Props = {
  boardOutcome: BoardOutcome;
};

const ADJUSTED_REGEX = /^A(\d+)\/(\d+)$/;

export function BoardResult({ boardOutcome }: Props) {
  if (isPlayedContractCode(boardOutcome)) {
    return <PlayedContract playedContractCode={boardOutcome} />;
  }

  const adjustedMatch = boardOutcome.match(ADJUSTED_REGEX);
  if (adjustedMatch) {
    return (
      <span className="text-amber-700 font-medium">
        Adj {adjustedMatch[1]}%/{adjustedMatch[2]}%
      </span>
    );
  }

  return <span>{boardOutcome}</span>;
}
