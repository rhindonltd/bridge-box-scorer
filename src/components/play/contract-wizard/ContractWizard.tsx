"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { ContractCode, ContractSuit, Doubling, Level } from "@/model/contract";
import { Card, Direction, Rank, Suit } from "@/model/common";
import { SpecialBoardOutcome } from "@/model/result";
import { useGame } from "@/context/GameContext";
import { useAssignment } from "@/context/AssignmentContext";

import { StepBoard } from "./StepBoard";
import { StepLevel } from "./StepLevel";
import { StepSuit } from "./StepSuit";
import { StepDeclarer } from "./StepDeclarer";
import { StepOpeningLead } from "./StepOpeningLead";
import { StepResult } from "./StepResult";
import { StepConfirm } from "./StepConfirm";

interface ContractWizardProps {
  round: number;
  table: number;
  roundBoards: number[];
  playedBoards: number[];
  leadCardRequired: boolean;
  onComplete: (data: {
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
}: ContractWizardProps) {
  const { game } = useGame();
  const { assignment } = useAssignment();

  // Step state
  const [step, setStep] = useState(0);
  const [selectedBoard, setSelectedBoard] = useState<number | null>(null);
  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    if (!boardDropdownOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setBoardDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [boardDropdownOpen]);

  // --- Board selection handler ---

  const handleBoardSelected = (board: number) => {
    setSelectedBoard(board);
    setBoardDropdownOpen(false);
    if (step === 0) {
      setStep(1);
    }
  };

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
      onComplete({ contract: specialOutcome, result: 0, lead: null });
      return;
    }

    if (level && suit && declarer !== null) {
      const contract: ContractCode = `${level}${suit}${dbl}${declarer}`;
      const lead: Card | null =
        leadSuit && leadRank ? (`${leadSuit}${leadRank}` as Card) : null;

      const numericResult = resultMode === "down" ? -resultValue : resultValue;

      onComplete({ contract, result: numericResult, lead });
    }
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

  const showBackArrow = step > 0;

  // --- Sub-header (blue bar) ---

  const showBoardButton = selectedBoard !== null && step !== 0;

  const subHeader = (
    <div className="bg-blue-600 text-white px-3 py-2.5 flex items-center justify-between shrink-0">
      <span className="font-bold text-lg">
        Table {table}, Round {round}
      </span>
      {showBoardButton && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setBoardDropdownOpen((v) => !v)}
            className="px-4 py-2 text-lg font-bold bg-white text-blue-900 rounded-lg border-2 border-blue-300 shadow-sm flex items-center gap-1"
          >
            Board {selectedBoard}
            <ChevronDown size={18} />
          </button>

          {boardDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[140px] overflow-hidden">
              {roundBoards.map((board) => {
                const isPlayed = playedBoards.includes(board);
                const isCurrent = board === selectedBoard;
                return (
                  <button
                    key={board}
                    type="button"
                    disabled={isPlayed}
                    onClick={() => handleBoardSelected(board)}
                    className={`w-full px-4 py-2.5 text-left text-base font-semibold transition
                      ${isCurrent ? "bg-blue-50 text-blue-900" : "text-gray-800 hover:bg-gray-50"}
                      ${isPlayed ? "opacity-40 cursor-not-allowed line-through" : ""}
                    `}
                  >
                    Board {board}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // --- Header (grey bar) ---

  const header = (
    <div className="bg-gray-200 text-gray-800 px-3 py-2 flex items-center gap-2 shrink-0">
      {showBackArrow && (
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
          <div className="font-semibold">{game?.eventName}</div>
          {(game?.sessionName || game?.sectionName) && (
            <div className="text-sm text-gray-600">
              {game?.sessionName}
              {game?.sessionName && game?.sectionName && ", "}
              {game?.sectionName}
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
          onBoardSelected={handleBoardSelected}
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
