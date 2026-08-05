"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { ContractCode, ContractSuit, Doubling, Level } from "@/model/contract";
import { Card, Direction, Rank, Suit } from "@/model/common";
import { SpecialBoardOutcome } from "@/model/result";
import { useGame } from "@/context/GameContext";

import { StepLevel } from "./StepLevel";
import { StepSuit } from "./StepSuit";
import { StepDeclarer } from "./StepDeclarer";
import { StepOpeningLead } from "./StepOpeningLead";
import { StepResult } from "./StepResult";
import { StepConfirm } from "./StepConfirm";
import { StepAdjustedScore } from "./StepAdjustedScore";

export type DirectorWizardResult =
  | {
      type: "contract";
      contract: ContractCode | SpecialBoardOutcome;
      result: number;
      lead: Card | null;
    }
  | {
      type: "adjusted";
      nsPercent: number;
      ewPercent: number;
    };

interface DirectorContractWizardProps {
  boardNumber: number;
  round: number;
  table: number;
  leadCardRequired: boolean;
  onComplete: (data: DirectorWizardResult) => void;
  onBack: () => void;
}

/**
 * A variant of ContractWizard for director use.
 * Skips the board selection step (board is pre-selected from the traveller).
 * Does not require AssignmentContext.
 */
export function DirectorContractWizard({
  boardNumber,
  round,
  table,
  leadCardRequired,
  onComplete,
  onBack,
}: DirectorContractWizardProps) {
  const { game } = useGame();

  // Steps: 1=Level, 2=Suit, 3=Declarer, 4=OpeningLead, 5=Result, 6=Confirm, 7=AdjustedScore
  const [step, setStep] = useState(1);

  // Contract state
  const [level, setLevel] = useState<Level | null>(null);
  const [suit, setSuit] = useState<ContractSuit | null>(null);
  const [declarer, setDeclarer] = useState<Direction | null>(null);
  const [dbl, setDbl] = useState<Doubling>("");
  const [specialOutcome, setSpecialOutcome] =
    useState<SpecialBoardOutcome | null>(null);

  // Lead state
  const [leadSuit, setLeadSuit] = useState<Suit | null>(null);
  const [leadRank, setLeadRank] = useState<Rank | null>(null);

  // Result state
  const [resultMode, setResultMode] = useState<"made" | "down">("made");
  const [resultValue, setResultValue] = useState(0);

  // --- Step transition handlers ---

  const onLevelSelected = (selectedLevel: Level) => {
    setLevel(selectedLevel);
    setSpecialOutcome(null);
    setStep(2);
  };

  const onSpecialOutcome = (outcome: SpecialBoardOutcome) => {
    setSpecialOutcome(outcome);
    setLevel(null);
    setSuit(null);
    setDeclarer(null);
    setDbl("");
    setStep(6);
  };

  const onSuitSelected = (selectedSuit: ContractSuit) => {
    setSuit(selectedSuit);
    setStep(3);
  };

  const onDeclarerSelected = (
    selectedDeclarer: Direction,
    selectedDbl: Doubling,
  ) => {
    setDeclarer(selectedDeclarer);
    setDbl(selectedDbl);
    setStep(leadCardRequired ? 4 : 5);
  };

  const onLeadComplete = (selectedSuit: Suit, selectedRank: Rank) => {
    setLeadSuit(selectedSuit);
    setLeadRank(selectedRank);
    setStep(5);
  };

  const onResultComplete = (mode: "made" | "down", value: number) => {
    setResultMode(mode);
    setResultValue(value);
    setStep(6);
  };

  const onSubmit = () => {
    if (specialOutcome) {
      onComplete({
        type: "contract",
        contract: specialOutcome,
        result: 0,
        lead: null,
      });
      return;
    }

    if (level && suit && declarer !== null) {
      const contract: ContractCode = `${level}${suit}${dbl}${declarer}`;
      const lead: Card | null =
        leadSuit && leadRank ? (`${leadSuit}${leadRank}` as Card) : null;

      const numericResult = resultMode === "down" ? -resultValue : resultValue;
      onComplete({ type: "contract", contract, result: numericResult, lead });
    }
  };

  const onAdjustedScoreSubmit = (nsPercent: number, ewPercent: number) => {
    onComplete({ type: "adjusted", nsPercent, ewPercent });
  };

  // --- Back arrow logic ---

  const handleBack = () => {
    switch (step) {
      case 1:
        onBack();
        break;
      case 2:
        setStep(1);
        break;
      case 3:
        setStep(2);
        break;
      case 4:
        setStep(3);
        break;
      case 5:
        setStep(leadCardRequired ? 4 : 3);
        break;
      case 6:
        setStep(specialOutcome ? 1 : 5);
        break;
      case 7:
        setStep(1);
        break;
    }
  };

  // --- Sub-header (blue bar) ---

  const subHeader = (
    <div className="bg-blue-600 text-white px-3 py-2.5 flex items-center justify-between shrink-0">
      <span className="font-bold text-lg">
        Table {table}, Round {round}
      </span>
      <span className="px-4 py-2 text-lg font-bold bg-white text-blue-900 rounded-lg border-2 border-blue-300 shadow-sm">
        Board {boardNumber}
      </span>
    </div>
  );

  // --- Header (grey bar) ---

  const header = (
    <div className="bg-gray-200 text-gray-800 px-3 py-2 flex items-center gap-2 shrink-0">
      <button
        onClick={handleBack}
        className="p-2 -ml-2 rounded-lg hover:bg-gray-300 transition"
        aria-label="Go back"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="flex-1 flex items-start justify-between min-w-0">
        <div className="truncate">
          <div className="font-semibold">{game?.eventName}</div>
          {(game?.sessionName || game?.sectionName) && (
            <div className="text-sm text-gray-600">
              {game?.sessionName}
              {game?.sessionName && game?.sectionName && ", "}
              {game?.sectionName}
            </div>
          )}
        </div>
        <span className="text-base font-semibold text-gray-600">Director</span>
      </div>
    </div>
  );

  // --- Step rendering ---

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepLevel
            onLevelSelected={onLevelSelected}
            onSpecialOutcome={onSpecialOutcome}
            onAdjustedScore={() => setStep(7)}
          />
        );
      case 2:
        return <StepSuit level={level!} onSuitSelected={onSuitSelected} />;
      case 3:
        return (
          <StepDeclarer
            level={level!}
            suit={suit!}
            onDeclarerSelected={onDeclarerSelected}
          />
        );
      case 4:
        return (
          <StepOpeningLead
            onLeadComplete={onLeadComplete}
            initialSuit={leadSuit}
            initialRank={leadRank}
            onSuitChange={setLeadSuit}
            onRankChange={setLeadRank}
          />
        );
      case 5:
        return (
          <StepResult level={level!} onResultComplete={onResultComplete} />
        );
      case 6:
        return (
          <StepConfirm
            level={level}
            suit={suit}
            declarer={declarer}
            dbl={dbl}
            specialOutcome={specialOutcome}
            leadSuit={leadSuit}
            leadRank={leadRank}
            resultMode={resultMode}
            resultValue={resultValue}
            onSubmit={onSubmit}
          />
        );
      case 7:
        return <StepAdjustedScore onSubmit={onAdjustedScoreSubmit} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {header}
      {subHeader}
      {renderStep()}
    </div>
  );
}
