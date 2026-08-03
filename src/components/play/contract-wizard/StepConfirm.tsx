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

function formatResult(mode: "made" | "down", value: number): string {
  if (mode === "made") {
    return value === 0 ? "Made exactly" : `Made +${value}`;
  }
  return `Down ${value}`;
}

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
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-3xl font-bold">
          {formatSpecialOutcome(specialOutcome)}
        </p>
        <div className="mt-auto w-full pt-6">
          <button
            onClick={onSubmit}
            className="bg-green-700 text-white py-3 text-lg font-bold rounded-xl w-full"
          >
            Submit
          </button>
        </div>
      </div>
    );
  }

  const contractText = level && suit && declarer
    ? `${level}${ContractSuitDisplay[suit]} by ${DirectionNames[declarer]}${dbl ? `, ${dbl === "X" ? "Doubled" : "Redoubled"}` : ""}`
    : "";

  const leadText =
    leadSuit && leadRank ? `Lead: ${SuitMap[leadSuit]}${leadRank}` : null;

  const resultText = formatResult(resultMode, resultValue);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center">
        <p className="text-3xl font-bold">{contractText}</p>
        {leadText && (
          <p className="text-xl text-gray-700 mt-4">{leadText}</p>
        )}
        <p className="text-xl text-gray-700 mt-4">{resultText}</p>
      </div>
      <div className="mt-auto w-full pt-6">
        <button
          onClick={onSubmit}
          className="bg-green-700 text-white py-3 text-lg font-bold rounded-xl w-full"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
