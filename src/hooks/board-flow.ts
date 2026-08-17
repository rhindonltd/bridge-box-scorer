"use client";

import { useState } from "react";
import { ContractSuit, Doubling, Level } from "../model/contract";
import { SpecialBoardOutcome } from "../model/result";
import { Direction, Rank, Suit } from "../model/common";

type Props = {
  leadCardRequired: boolean;
};

export function useBoardFlow({ leadCardRequired }: Props) {
  // Step state
  const [step, setStep] = useState(0);

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

  // --- Back arrow logic ---

  const handleBack = () => {
    switch (step) {
      case 1:
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

    handleBack,
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
