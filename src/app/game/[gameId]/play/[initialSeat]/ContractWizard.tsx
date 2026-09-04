"use client";

import { ArrowLeft } from "lucide-react";

import { ContractCode } from "@/model/contract";
import { Card } from "@/model/common";
import { SpecialBoardOutcome } from "@/model/result";
import { useRequiredGame } from "@/context/GameContext";
import { useAssignment } from "@/context/AssignmentContext";

import { StepBoard } from "@/components/contract-wizard/StepBoard";
import { StepLevel } from "@/components/contract-wizard/StepLevel";
import { StepSuit } from "@/components/contract-wizard/StepSuit";
import { StepDeclarer } from "@/components/contract-wizard/StepDeclarer";
import { StepOpeningLead } from "@/components/contract-wizard/StepOpeningLead";
import { StepResult } from "@/components/contract-wizard/StepResult";
import { StepConfirm } from "@/components/contract-wizard/StepConfirm";
import { useBoardFlow } from "@/hooks/board-flow";
import { BoardDropDown } from "@/components/contract-wizard/BoardDropDown";

interface Props {
  round: number;
  table: number;
  roundBoards: number[];
  playedBoards: number[];
  leadCardRequired: boolean;
  onComplete: (data: {
    board: number;
    contract: ContractCode | SpecialBoardOutcome;
    result: number;
    lead: Card | null;
  }) => void;
}

export function ContractWizard({
  round,
  table,
  roundBoards,
  playedBoards,
  leadCardRequired,
  onComplete,
}: Props) {
  const { game } = useRequiredGame();
  const { assignment } = useAssignment();

  const {
    level,
    suit,
    declarer,
    dbl,
    specialOutcome,
    leadSuit,
    leadRank,
    resultMode,
    resultValue,
    step,
    selectedBoard,
    handleBack,
    onBoardSelected,
    onLeadComplete,
    setLeadSuit,
    setLeadRank,
    onResultComplete,
    onLevelSelected,
    onSpecialOutcome,
    onSuitSelected,
    onDeclarerSelected,
  } = useBoardFlow({ leadCardRequired });

  const onSubmit = () => {
    /* v8 ignore next -- defensive: the confirm step (6) is only reachable
       after a board is chosen, so selectedBoard is never null here. */
    if (selectedBoard === null) return;

    if (specialOutcome) {
      onComplete({
        board: selectedBoard,
        contract: specialOutcome,
        result: 0,
        lead: null,
      });
      return;
    }

    /* v8 ignore next -- defensive: at the confirm step a non-special contract
       always has level, suit and declarer set, so the false branch is dead. */
    if (level && suit && declarer !== null) {
      const contract: ContractCode = `${level}${suit}${dbl}${declarer}`;
      const lead: Card | null =
        leadSuit && leadRank ? (`${leadSuit}${leadRank}` as Card) : null;

      const numericResult = resultMode === "down" ? -resultValue : resultValue;

      onComplete({
        board: selectedBoard,
        contract,
        result: numericResult,
        lead,
      });
    }
  };

  const subHeader = (
    <div className="bg-blue-600 text-white px-3 py-2.5 flex items-center justify-between shrink-0">
      <span className="font-bold text-lg">
        Table {table}, Round {round}
      </span>
      {step !== 0 && (
        <BoardDropDown
          roundBoards={roundBoards}
          playedBoards={playedBoards}
          selectedBoard={selectedBoard}
          onBoardSelected={onBoardSelected}
        />
      )}
    </div>
  );

  // --- Header (grey bar) ---

  const header = (
    <div className="bg-gray-200 text-gray-800 px-3 py-2 flex items-center gap-2 shrink-0">
      {step > 0 && (
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-300 transition"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="flex-1 flex items-start justify-between min-w-0">
        <div className="truncate">
          <div className="font-semibold">{game.eventName}</div>
          {(game.sessionName || game.sectionName) && (
            <div className="text-sm text-gray-600">
              {game.sessionName}
              {game.sessionName && game.sectionName && ", "}
              {game.sectionName}
            </div>
          )}
        </div>
        {assignment && (
          <span className="text-base font-semibold">
            {assignment.type === "PAIR" ? "Pair" : "Team"} {assignment.id}
          </span>
        )}
      </div>
    </div>
  );

  // --- Step rendering ---

  const renderStep = () => {
    if (step === 0) {
      return (
        <StepBoard
          boards={roundBoards}
          playedBoards={playedBoards}
          onBoardSelected={onBoardSelected}
        />
      );
    }

    switch (step) {
      case 1:
        return (
          <StepLevel
            onLevelSelected={onLevelSelected}
            onSpecialOutcome={onSpecialOutcome}
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
      /* v8 ignore next 2 -- defensive: useBoardFlow only ever produces
         steps 0-6, all handled above, so this default is unreachable. */
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
