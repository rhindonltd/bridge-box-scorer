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
import { WizardShell } from "@/components/contract-wizard/WizardShell";
import type { ContractEntryInitial } from "@/hooks/use-contract-entry";
import { useBoardFlow } from "@/hooks/board-flow";
import { BoardDropDown } from "@/components/contract-wizard/BoardDropDown";

interface Props {
  round: number;
  table: number;
  roundBoards: number[];
  playedBoards: number[];
  leadCardRequired: boolean;
  /** An entry to resume (the player backed out of the waiting screen). */
  draft?: { board: number; entry: ContractEntryInitial } | null;
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
  draft,
  onComplete,
  headerRight,
}: Props) {
  const {
    level,
    suit,
    declarer,
    dbl,
    leadSuit,
    leadRank,
    step,
    selectedBoard,
    boardAutoSelected,
    handleBack,
    onBoardSelected,
    onLeadComplete,
    setLeadSuit,
    setLeadRank,
    onLevelSelected,
    onSuitSelected,
    onDeclarerSelected,
  } = useBoardFlow({
    leadCardRequired,
    roundBoards,
    playedBoards,
    draft,
  });

  // The player flow has no Confirm page: the result (or a special outcome)
  // submits straight away, so the values are passed in rather than read from
  // state that has not updated yet.
  const submitSpecial = (outcome: SpecialBoardOutcome) => {
    /* v8 ignore next -- defensive: the level step is only reachable after a
       board is chosen, so selectedBoard is never null here. */
    if (selectedBoard === null) return;
    onComplete({
      board: selectedBoard,
      contract: outcome,
      result: 0,
      lead: null,
    });
  };

  const submitResult = (mode: "made" | "down", value: number) => {
    /* v8 ignore next -- defensive: the result step is only reachable after a
       board is chosen, so selectedBoard is never null here. */
    if (selectedBoard === null) return;

    /* v8 ignore next -- defensive: at the result step a non-special contract
       always has level, suit and declarer set, so the false branch is dead. */
    if (level && suit && declarer !== null) {
      const contract = buildContractCode(level, suit, dbl, declarer);
      const lead: Card | null =
        leadSuit && leadRank ? (`${leadSuit}${leadRank}` as Card) : null;

      onComplete({
        board: selectedBoard,
        contract,
        result: mode === "down" ? -value : value,
        lead,
      });
    }
  };

  // Title shown in the header for the current step. Choosing the level, suit
  // and declarer are all "entering the contract", so those share one title.
  const stepTitle = (() => {
    switch (step) {
      case 0:
        return "Select a board";
      case 4:
        return "Opening Lead";
      case 5:
        return "Enter Result";
      default:
        return "Enter Contract";
    }
  })();

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
            onSpecialOutcome={submitSpecial}
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
        return <StepResult level={level!} onResultComplete={submitResult} />;
      /* v8 ignore next 2 -- defensive: useBoardFlow only ever produces
         steps 0-5 here, all handled above, so this default is unreachable. */
      default:
        return null;
    }
  };

  return (
    <WizardShell
      title={stepTitle}
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
