import { BoardOutcome } from "@/model/score";
import { isPlayedContractCode, parsePlayedContract } from "@/model/result";
import { ContractSuit } from "@/model/contract";
import { JSX } from "react/jsx-runtime";

type Props = {
  boardOutcome: BoardOutcome;
};

const ADJUSTED_REGEX = /^A(\d+)\/(\d+)$/;

const SUIT_SYMBOLS: Record<ContractSuit, JSX.Element> = {
  S: <span className="text-black">♠</span>,
  H: <span className="text-red-600">♥</span>,
  D: <span className="text-red-600">♦</span>,
  C: <span className="text-black">♣</span>,
  NT: <>NT</>,
};

export function BoardResult({ boardOutcome }: Props) {
  if (isPlayedContractCode(boardOutcome)) {
    const parsed = parsePlayedContract(boardOutcome);

    return (
      <>
        {parsed.level}
        {SUIT_SYMBOLS[parsed.suit]}
        {parsed.doubling}
        {parsed.declarer}
        {parsed.result}
      </>
    );
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
