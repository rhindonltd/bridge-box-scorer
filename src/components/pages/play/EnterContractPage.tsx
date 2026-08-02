"use client";

import React, { useState } from "react";

import SubmitButton from "@/components/contract/SubmitButton";
import PassOutButton from "@/components/contract/PassOutButton";
import NotPlayedButton from "@/components/contract/NotPlayedButton";
import { ContractCode, ContractSuit, Doubling, Level } from "@/model/contract";
import { Direction } from "@/model/common";
import { PlayableContract } from "@/components/pages/play/PlayableContract";
import { usePlay } from "@/context/PlayContext";
import { useGame } from "@/context/GameContext";
import { useAssignment } from "@/context/AssignmentContext";
import { SpecialBoardOutcome } from "@/model/result";
import type { Assignment } from "@/model/participants";

type Props = {
  round: number;
  table: number;
  roundBoards: number[];
  onOk: (contract: ContractCode | SpecialBoardOutcome) => void;
};

export default function EnterContractPage({
  round,
  table,
  roundBoards,
  onOk,
}: Props) {
  const { boardSelection, selectBoard } = usePlay();
  const { game } = useGame();
  const { assignment } = useAssignment();

  const [level, setLevel] = useState<Level | null>(null);
  const [suit, setSuit] = useState<ContractSuit | null>(null);
  const [declarer, setDeclarer] = useState<Direction | null>(null);
  const [passOut, setPassOut] = useState<boolean>(false);
  const [notPlayed, setNotPlayed] = useState<boolean>(false);
  const [dbl, setDbl] = useState<Doubling>("");
  // const [result, setResult] = useState(0);

  // const adjustResult = (value: number) => {
  //   setResult((r) => Math.max(-13, Math.min(7, value)));
  // };

  const handleOnOK = () => {
    if (passOut) {
      onOk("PO");
    }

    if (notPlayed) {
      onOk("NP");
    }

    if (level !== null && suit !== null && dbl !== null && declarer !== null) {
      onOk(`${level}${suit}${dbl}${declarer}`);
    }
  };

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

  const onLevelSelected = (level: Level) => {
    setNotPlayed(false);
    setPassOut(false);
    setLevel(level);
  };

  const onSuitSelected = (suit: ContractSuit) => {
    setNotPlayed(false);
    setPassOut(false);
    setSuit(suit);
  };

  const onDeclarerSelected = (declarer: Direction) => {
    setNotPlayed(false);
    setPassOut(false);
    setDeclarer(declarer);
  };

  const onDblSelected = (dbl: Doubling) => {
    setNotPlayed(false);
    setPassOut(false);
    setDbl(dbl);
  };

  const contract = notPlayed
    ? "Not Played"
    : passOut
      ? "Pass Out"
      : level && suit
        ? `${level}${suit}${dbl} by ${declarer ?? "?"}`
        : "-";

  return (
    <div className="flex-1 flex flex-col">
      {/* Context bar */}
      <div className="bg-gray-200 text-gray-800 px-3 py-2 flex items-start justify-between text-base shrink-0">
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

      {/* Detail bar — table, round, board selector */}
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
            value={boardSelection!.board}
            onChange={(e) => selectBoard(Number(e.target.value))}
          >
            {roundBoards.map((roundBoard) => (
              <option key={roundBoard} value={roundBoard}>
                {roundBoard}
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

      {/* MIDDLE: 2x2 CONTROLS (fills remaining space, capped on tablets) */}
      <div className="flex-1 min-h-0">
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

      {/* BOTTOM */}
      <div className="p-2">
        <SubmitButton onSubmit={handleOnOK} />
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
