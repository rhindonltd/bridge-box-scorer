import { ContractSuit } from "@/model/contract";
import { JSX } from "react";
import { parsePlayedContract, PlayedContractCode } from "@/model/result";

type Props = {
  playedContractCode: PlayedContractCode;
};

const SUIT_SYMBOLS: Record<ContractSuit, JSX.Element> = {
  S: <span className="text-black">♠</span>,
  H: <span className="text-red-600">♥</span>,
  D: <span className="text-red-600">♦</span>,
  C: <span className="text-black">♣</span>,
  NT: <>NT</>,
};

export function PlayedContract({ playedContractCode }: Props) {
  const parsed = parsePlayedContract(playedContractCode);

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
