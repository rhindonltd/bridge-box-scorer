"use client";

import React, { useState } from "react";

import SubmitButton from "@/components/contract/SubmitButton";
import PassOutButton from "@/components/contract/PassOutButton";
import NotPlayedButton from "@/components/contract/NotPlayedButton";
import { ContractCode, ContractSuit, Doubling, Level } from "@/model/contract";
import { SpecialBoardOutcome } from "@/model/score-traveller";
import { Direction } from "@/model/common";
import { SectionInfo } from "@/components/common/SectionInfo";
import { TableRoundPairBoardInfo } from "@/components/common/TableRoundPairBoardInfo";
import { PlayableContract } from "@/components/pages/play/PlayableContract";
import { usePlay } from "@/context/PlayContext";

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
    <div className="h-screen flex flex-col bg-gray-100">
      <SectionInfo />

      {/* TOP GRID */}
      <div className="grid grid-cols-2 w-full items-stretch">
        <TableRoundPairBoardInfo round={round} table={table} />

        <div className="flex flex-row items-center justify-center bg-blue-300">
          <span className="pr-2 font-bold">Board:</span>
          <select
            className="p-1 border rounded-md bg-white text-center"
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

        <div className="flex flex-row justify-center gap-1 p-1">
          <PassOutButton onPassOut={onPassOut} />
          <NotPlayedButton onNotPlayed={onNotPlayed} />
        </div>

        <div className="flex items-center justify-center bg-gray-300 text-3xl font-semibold">
          {contract}
        </div>
      </div>

      {/* MIDDLE: 2x2 CONTROLS (fills ALL remaining space) */}
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
