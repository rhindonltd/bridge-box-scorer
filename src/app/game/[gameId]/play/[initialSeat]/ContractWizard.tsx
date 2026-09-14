"use client";

import { ContractCode, buildContractCode } from "@/model/contract";
import { Card } from "@/model/common";
import { SpecialBoardOutcome } from "@/model/result";

import { StepBoard } from "@/components/contract-wizard/StepBoard";
import { StepLevel } from "@/components/contract-wizard/StepLevel";
import { StepSuit } from "@/components/contract-wizard/StepSuit";
import { StepDeclarer } from "@/components/contract-wizard/StepDeclarer";
import { StepOpeningLead } from "@/components/contract-wizard/StepOpeningLead";
import { StepResult } from "@/components/contract-wizard/StepResult";
import { StepConfirm } from "@/components/contract-wizard/StepConfirm";
import { WizardShell } from "@/components/contract-wizard/WizardShell";
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
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

export function ContractWizard({
  round,
  table,
  roundBoards,
  playedBoards,
  leadCardRequired,
  onComplete,
  headerRight,
}: Props) {
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
    boardAutoSelected,
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
  } = useBoardFlow({ leadCardRequired, roundBoards, playedBoards });

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
      const contract = buildContractCode(level, suit, dbl, declarer);
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
    <WizardShell
      round={round}
      table={table}
      headerRight={headerRight}
      // The back arrow is hidden on step 0 (nothing to go back to) and on the
      // auto-selected first result step (no board-selection screen behind it).
      showBack={step > 0 && !(step === 1 && boardAutoSelected)}
      onBack={handleBack}
      subHeaderRight={
        step !== 0 ? (
          <BoardDropDown
            roundBoards={roundBoards}
            playedBoards={playedBoards}
            selectedBoard={selectedBoard}
            onBoardSelected={onBoardSelected}
          />
        ) : undefined
      }
    >
      {renderStep()}
    </WizardShell>
  );
}
