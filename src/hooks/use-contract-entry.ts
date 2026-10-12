"use client";

import { useState } from "react";
import { ContractSuit, Doubling, Level } from "@/model/contract";
import { SpecialBoardOutcome } from "@/model/result";
import { Direction, Rank, Suit } from "@/model/common";

/**
 * The contract-entry sub-flow shared by the player board wizard
 * ({@link import("./board-flow").useBoardFlow}) and the director correction
 * wizard (`DirectorContractWizard`): the Level → Suit → Declarer → (Opening
 * Lead) → Result → Confirm run that assembles a played contract.
 *
 * Both wizards drive this sub-flow with the SAME step numbers — 1=Level,
 * 2=Suit, 3=Declarer, 4=OpeningLead, 5=Result, 6=Confirm — differing only in
 * what sits at step 0 (the player's board picker vs the director's adjustment
 * hub) and, for the director, the extra ruling branches (steps 7+). So this
 * hook owns the contract/lead/result state, the forward transition handlers,
 * the reset, and the back-navigation for steps 2–6; each wizard keeps its own
 * step-0 entry and (for the director) its branch steps.
 *
 * `setStep` is the owning wizard's step setter, so the shared transitions move
 * the wizard through the common steps while the wizard still owns the state.
 */
export function useContractEntry(
  leadCardRequired: boolean,
  setStep: (step: number) => void,
) {
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

  // --- Forward transition handlers (identical in both wizards) ---

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

  /**
   * Reset the whole sub-flow to a clean contract entry at step 1. Used when
   * (re-)entering the contract branch (the director hub's "Enter Contract").
   */
  const reset = () => {
    setLevel(null);
    setSuit(null);
    setDeclarer(null);
    setDbl("");
    setSpecialOutcome(null);
    setLeadSuit(null);
    setLeadRank(null);
    setResultMode("made");
    setResultValue(0);
    setStep(1);
  };

  /**
   * Back-navigation within the contract steps (2–6). Returns the step moved to,
   * or `null` when `step` is not one of the shared contract steps so the owning
   * wizard can handle its own step-0 / branch back behaviour. Step 1 (Level) is
   * NOT handled here — its "back" differs per wizard (board picker vs hub).
   */
  const contractBack = (step: number): number | null => {
    switch (step) {
      case 2:
        setStep(1);
        return 1;
      case 3:
        setStep(2);
        return 2;
      case 4:
        setStep(3);
        return 3;
      case 5: {
        const target = leadCardRequired ? 4 : 3;
        setStep(target);
        return target;
      }
      case 6: {
        const target = specialOutcome ? 1 : 5;
        setStep(target);
        return target;
      }
      default:
        return null;
    }
  };

  return {
    // state
    level,
    suit,
    declarer,
    dbl,
    specialOutcome,
    leadSuit,
    leadRank,
    resultMode,
    resultValue,
    // lead setters (the opening-lead step edits these directly)
    setLeadSuit,
    setLeadRank,
    // transitions
    onLevelSelected,
    onSpecialOutcome,
    onSuitSelected,
    onDeclarerSelected,
    onLeadComplete,
    onResultComplete,
    reset,
    contractBack,
  };
}
