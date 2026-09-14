"use client";

import { useState } from "react";
import { ContractSuit, Doubling, Level } from "../model/contract";
import { SpecialBoardOutcome } from "../model/result";
import { Direction, Rank, Suit } from "../model/common";

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

  const onBoardSelected = (board: number) => {
    setSelectedBoard(board);
    setStep(1);
  };

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

  // --- Back arrow logic ---

  const handleBack = () => {
    switch (step) {
      case 1:
        // When the board was auto-selected (only one selectable), there is no
        // board-selection screen to go back to, so stay put.
        if (autoSelectedBoard !== null) {
          break;
        }
        setSelectedBoard(null);
        setStep(0);
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
    }
  };

  return {
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
    // True when there was only one selectable board and it was auto-selected,
    // so the board-selection screen is skipped.
    boardAutoSelected: autoSelectedBoard !== null,

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
  };
}
