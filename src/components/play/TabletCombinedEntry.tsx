"use client";

import React, { useState } from "react";

import { ContractCode, ContractSuit, Doubling, Level } from "@/model/contract";
import { Card, Direction, Rank, Suit } from "@/model/common";
import { PlayableContract } from "@/components/pages/play/PlayableContract";
import { InlineOpeningLead } from "@/components/play/InlineOpeningLead";
import { InlineBoardResult } from "@/components/play/InlineBoardResult";
import PassOutButton from "@/components/contract/PassOutButton";
import NotPlayedButton from "@/components/contract/NotPlayedButton";
import { SpecialBoardOutcome } from "@/model/result";
import { useGame } from "@/context/GameContext";
import { useAssignment } from "@/context/AssignmentContext";
import type { Assignment } from "@/model/participants";

export type TabletCombinedEntryProps = {
  round: number;
  table: number;
  roundBoards: number[];
  leadCardRequired: boolean;
  onComplete: (data: {
    contract: ContractCode | SpecialBoardOutcome;
    result: number;
    lead: Card | null;
  }) => void;
};

export function TabletCombinedEntry({
  round,
  table,
  roundBoards,
  leadCardRequired,
  onComplete,
}: TabletCombinedEntryProps) {
  const { game } = useGame();
  const { assignment } = useAssignment();

  // Contract state
  const [level, setLevel] = useState<Level | null>(null);
  const [suit, setSuit] = useState<ContractSuit | null>(null);
  const [declarer, setDeclarer] = useState<Direction | null>(null);
  const [dbl, setDbl] = useState<Doubling>("");
  const [passOut, setPassOut] = useState<boolean>(false);
  const [notPlayed, setNotPlayed] = useState<boolean>(false);

  // Lead state
  const [leadSuit, setLeadSuit] = useState<Suit | null>(null);
  const [leadRank, setLeadRank] = useState<Rank | null>(null);

  // Result state
  const [resultMode, setResultMode] = useState<"made" | "down">("made");
  const [resultValue, setResultValue] = useState<number>(0);

  // Board selection
  const [selectedBoard, setSelectedBoard] = useState<number>(roundBoards[0]);

  // Derived state
  const hasValidContract = level !== null && suit !== null && declarer !== null;
  const isSpecialOutcome = passOut || notPlayed;

  const contractCode = hasValidContract ? `${level}${suit}` : "1S";

  const isSubmitEnabled =
    isSpecialOutcome ||
    (hasValidContract &&
      resultValue !== null &&
      (!leadCardRequired || (leadSuit !== null && leadRank !== null)));

  // Contract display text
  const contract = notPlayed
    ? "Not Played"
    : passOut
      ? "Pass Out"
      : level && suit
        ? `${level}${suit}${dbl} by ${declarer ?? "?"}`
        : "-";

  // Contract state handlers
  const onPassOut = () => {
    setPassOut(true);
    setNotPlayed(false);
    setLevel(null);
    setSuit(null);
    setDeclarer(null);
    setDbl("");
  };

  const onNotPlayed = () => {
    setNotPlayed(true);
    setPassOut(false);
    setLevel(null);
    setSuit(null);
    setDeclarer(null);
    setDbl("");
  };

  const onLevelSelected = (l: Level) => {
    setNotPlayed(false);
    setPassOut(false);
    setLevel(l);
  };

  const onSuitSelected = (s: ContractSuit) => {
    setNotPlayed(false);
    setPassOut(false);
    setSuit(s);
  };

  const onDeclarerSelected = (d: Direction) => {
    setNotPlayed(false);
    setPassOut(false);
    setDeclarer(d);
  };

  const onDblSelected = (d: Doubling) => {
    setNotPlayed(false);
    setPassOut(false);
    setDbl(d);
  };

  // Submit handler
  function handleSubmit() {
    if (passOut) {
      onComplete({ contract: "PO", result: 0, lead: null });
      return;
    }
    if (notPlayed) {
      onComplete({ contract: "NP", result: 0, lead: null });
      return;
    }

    const contractString = `${level}${suit}${dbl}${declarer}` as ContractCode;
    const result = resultMode === "made" ? resultValue : -resultValue;
    const lead = leadCardRequired ? (`${leadSuit}${leadRank}` as Card) : null;
    onComplete({ contract: contractString, result, lead });
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Event info header bar */}
      <div className="bg-gray-200 text-gray-800 px-3 py-2 text-base font-semibold shrink-0">
        <div className="flex items-start justify-between">
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
          <ParticipantInfoInline assignment={assignment} />
        </div>
      </div>

      {/* Table/Round/Board selector bar */}
      <div className="bg-blue-600 text-white px-3 py-2.5 flex items-center justify-between shrink-0">
        <span className="font-bold text-lg">
          Table {table}, Round {round}
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="board-selector" className="font-semibold text-base">
            Board:
          </label>
          <select
            id="board-selector"
            className="px-2 py-1 text-base border border-blue-400 rounded-md bg-white text-blue-900 text-center font-bold"
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(Number(e.target.value))}
          >
            {roundBoards.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contract display + Pass Out / Not Played */}
      <div className="grid grid-cols-2 w-full items-stretch shrink-0">
        <div className="flex flex-row justify-center gap-2 p-2">
          <PassOutButton onPassOut={onPassOut} />
          <NotPlayedButton onNotPlayed={onNotPlayed} />
        </div>

        <div className="flex items-center justify-center bg-gray-200 text-xl font-bold p-2 truncate">
          {contract}
        </div>
      </div>

      {/* Main content area — flex proportional */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Contract section */}
        <div className="shrink-0">
          <PlayableContract
            level={level}
            suit={suit}
            declarer={declarer}
            dbl={dbl}
            onLevelSelected={onLevelSelected}
            onSuitSelected={onSuitSelected}
            onDeclarerSelected={onDeclarerSelected}
            onDblSelected={onDblSelected}
          />
        </div>

        {/* Lead section (if required, with progressive reveal) */}
        {leadCardRequired && (
          <div
            className={`shrink-0 flex flex-col ${!hasValidContract ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="text-sm font-bold bg-blue-600 text-white px-2 py-1 shrink-0">
              Opening Lead
            </div>
            <div className="p-1 flex-1 min-h-0">
              <InlineOpeningLead
                suit={leadSuit}
                rank={leadRank}
                onSuitChange={setLeadSuit}
                onRankChange={setLeadRank}
              />
            </div>
          </div>
        )}

        {/* Result section (with progressive reveal) */}
        <div
          className={`shrink-0 flex flex-col ${!hasValidContract ? "opacity-50 pointer-events-none" : ""}`}
        >
          <div className="text-sm font-bold bg-blue-600 text-white px-2 py-1 shrink-0">
            Result
          </div>
          <div className="p-1 flex-1 min-h-0">
            <InlineBoardResult
              contract={contractCode}
              mode={resultMode}
              value={resultValue}
              onModeChange={setResultMode}
              onValueChange={setResultValue}
            />
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="p-2 shrink-0">
        <button
          disabled={!isSubmitEnabled}
          onClick={handleSubmit}
          className={`w-full p-3 text-lg rounded-xl font-semibold ${isSubmitEnabled ? "bg-green-700 text-white" : "bg-gray-300 text-gray-500"}`}
        >
          Submit
        </button>
      </div>
    </div>
  );
}

function ParticipantInfoInline({
  assignment,
}: {
  assignment: Assignment | null;
}) {
  if (!assignment) return null;

  const label = assignment.type === "PAIR" ? "Pair" : "Team";

  return (
    <span className="text-base font-semibold">
      {label} {assignment.id}
    </span>
  );
}
