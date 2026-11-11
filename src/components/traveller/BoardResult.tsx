import { BoardOutcome } from "@/model/score";
import {
  isPlayedContractCode,
  parsePlayedContract,
  PlayedContractCode,
} from "@/model/result";
import { ContractSuit } from "@/model/contract";
import {
  isAdjustedScore,
  isWeightedScore,
  parseAdjustedScore,
  parseWeightedScore,
} from "@/model/adjusted-score";
import { JSX } from "react/jsx-runtime";

type Props = {
  boardOutcome: BoardOutcome;
};

const SUIT_SYMBOLS: Record<ContractSuit, JSX.Element> = {
  S: <span className="text-black">♠</span>,
  H: <span className="text-red-600">♥</span>,
  D: <span className="text-red-600">♦</span>,
  C: <span className="text-black">♣</span>,
  NT: <>NT</>,
};

export function BoardResult({ boardOutcome }: Props) {
  if (isPlayedContractCode(boardOutcome)) {
    return <ContractDisplay contract={boardOutcome} />;
  }

  if (isAdjustedScore(boardOutcome)) {
    const adj = parseAdjustedScore(boardOutcome);
    /* v8 ignore start -- unreachable fallbacks: isAdjustedScore() passing guarantees parseAdjustedScore() returns a value */
    const ns = adj?.ns ?? 0;
    const ew = adj?.ew ?? 0;
    /* v8 ignore stop */
    return (
      <span className="text-amber-700 font-medium">
        Adj {ns}%/{ew}%
      </span>
    );
  }

  if (isWeightedScore(boardOutcome)) {
    const components = parseWeightedScore(boardOutcome);
    /* v8 ignore next -- unreachable: isWeightedScore() passing guarantees parseWeightedScore() returns a non-empty array */
    if (components && components.length > 0) {
      return (
        <span className="text-purple-700 font-medium">
          Wtd{" "}
          {components.map((c, i) => (
            <span key={i}>
              {i > 0 && ", "}
              {c.weight}%{" "}
              <ContractDisplay contract={c.contract} />
            </span>
          ))}
        </span>
      );
    }
  }

  return <span>{boardOutcome}</span>;
}

/** Inline display of a played contract with suit symbols. */
function ContractDisplay({ contract }: { contract: PlayedContractCode }) {
  const parsed = parsePlayedContract(contract);
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
