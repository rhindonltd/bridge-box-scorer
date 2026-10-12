"use client";

import { useState } from "react";
import { useContractEntry } from "./use-contract-entry";

type Props = {
  leadCardRequired: boolean;
  /** All boards for the round. */
  roundBoards: number[];
  /** Boards already confirmed (not selectable). */
  playedBoards: number[];
};

export function useBoardFlow({
  leadCardRequired,
  roundBoards,
  playedBoards,
}: Props) {
  // The boards still available for selection.
  const selectableBoards = roundBoards.filter(
    (b) => !playedBoards.includes(b),
  );

  // When only one board is selectable, skip the board-selection screen and
  // go straight to result entry with that board pre-selected.
  const autoSelectedBoard =
    selectableBoards.length === 1 ? selectableBoards[0] : null;

  // Step state — start on result entry (step 1) when a board is auto-selected.
  const [step, setStep] = useState(autoSelectedBoard !== null ? 1 : 0);

  // Board state — the board the player has chosen to enter on step 0.
  const [selectedBoard, setSelectedBoard] = useState<number | null>(
    autoSelectedBoard,
  );

  // The shared Level → … → Confirm contract-entry sub-flow (steps 1–6).
  const contract = useContractEntry(leadCardRequired, setStep);

  // --- Step 0 (board selection) transition, player-only ---

  const onBoardSelected = (board: number) => {
    setSelectedBoard(board);
    setStep(1);
  };

  // --- Back arrow logic ---

  const handleBack = () => {
    // Steps 2–6 are the shared contract sub-flow.
    if (contract.contractBack(step) !== null) return;

    // Step 1 is the player-specific entry back to the board picker (unless the
    // board was auto-selected, in which case there is no picker to return to).
    if (step === 1) {
      if (autoSelectedBoard !== null) return;
      setSelectedBoard(null);
      setStep(0);
    }
  };

  return {
    level: contract.level,
    suit: contract.suit,
    declarer: contract.declarer,
    dbl: contract.dbl,
    specialOutcome: contract.specialOutcome,
    leadSuit: contract.leadSuit,
    leadRank: contract.leadRank,
    resultMode: contract.resultMode,
    resultValue: contract.resultValue,
    step,
    selectedBoard,
    // True when there was only one selectable board and it was auto-selected,
    // so the board-selection screen is skipped.
    boardAutoSelected: autoSelectedBoard !== null,

    handleBack,
    onBoardSelected,
    onLeadComplete: contract.onLeadComplete,
    setLeadSuit: contract.setLeadSuit,
    setLeadRank: contract.setLeadRank,
    onResultComplete: contract.onResultComplete,
    onLevelSelected: contract.onLevelSelected,
    onSpecialOutcome: contract.onSpecialOutcome,
    onSuitSelected: contract.onSuitSelected,
    onDeclarerSelected: contract.onDeclarerSelected,
  };
}
