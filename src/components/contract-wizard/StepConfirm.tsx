"use client";

import { ContractSuit, Doubling, Level } from "@/model/contract";
import { Direction, Rank, Suit, SuitMap } from "@/model/common";
import { SpecialBoardOutcome } from "@/model/result";

const DirectionNames: Record<Direction, string> = {
  N: "North",
  S: "South",
  E: "East",
  W: "West",
};

const ContractSuitDisplay: Record<ContractSuit, string> = {
  S: SuitMap.S,
  H: SuitMap.H,
  D: SuitMap.D,
  C: SuitMap.C,
  NT: "NT",
};

type Props = {
  level: Level | null;
  suit: ContractSuit | null;
  declarer: Direction | null;
  dbl: Doubling;
  specialOutcome: SpecialBoardOutcome | null;
  leadSuit: Suit | null;
  leadRank: Rank | null;
  resultMode: "made" | "down";
  resultValue: number;
  onSubmit: () => void;
};

function formatSpecialOutcome(outcome: SpecialBoardOutcome): string {
  return outcome === "PO" ? "Pass Out" : "Not Played";
}

export function StepConfirm({
  level,
  suit,
  declarer,
  dbl,
  specialOutcome,
  leadSuit,
  leadRank,
  resultMode,
  resultValue,
  onSubmit,
}: Props) {
  if (specialOutcome) {
    return (
      <div className="flex-1 flex flex-col p-6 min-h-0">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-3xl font-bold text-center">
            {formatSpecialOutcome(specialOutcome)}
          </p>
        </div>
        <div className="shrink-0 pt-4">
          <button
            onClick={onSubmit}
            data-testid="wizard-submit"
            className="bg-green-700 text-white py-3 text-lg font-bold rounded-xl w-full"
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  const suitSymbolColor = suit === "H" || suit === "D" ? "text-red-600" : "";

  const contractDisplay =
    level && suit && declarer ? (
      <>
        {level}
        <span className={suitSymbolColor}>{ContractSuitDisplay[suit]}</span>
        {dbl ? ` ${dbl === "X" ? "X" : "XX"}` : ""}
        {" by "}
        {DirectionNames[declarer]}
      </>
    ) : null;

  const leadDisplay =
    leadSuit && leadRank ? (
      <>
        Lead:{" "}
        <span
          className={leadSuit === "H" || leadSuit === "D" ? "text-red-600" : ""}
        >
          {SuitMap[leadSuit]}
        </span>
        {leadRank}
      </>
    ) : null;

  const resultDisplay =
    resultMode === "made" && resultValue === 0 ? (
      <span>
        Made <span className="text-green-600">✓</span>
      </span>
    ) : resultMode === "made" ? (
      <span>Made +{resultValue}</span>
    ) : (
      <span>Down {resultValue}</span>
    );

  return (
    <div className="flex-1 flex flex-col p-6 min-h-0">
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-center">{contractDisplay}</p>
        {leadDisplay && (
          <p className="text-3xl font-bold mt-4 text-center">{leadDisplay}</p>
        )}
        <p className="text-3xl font-bold mt-4 text-center">{resultDisplay}</p>
      </div>
      <div className="shrink-0 pt-4">
        <button
          onClick={onSubmit}
          data-testid="wizard-submit"
          className="bg-green-700 text-white py-3 text-lg font-bold rounded-xl w-full"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
