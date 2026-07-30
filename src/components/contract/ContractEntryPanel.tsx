"use client";

import React, { useState } from "react";

import SubmitButton from "@/components/contract/SubmitButton";
import PassOutButton from "@/components/contract/PassOutButton";
import NotPlayedButton from "@/components/contract/NotPlayedButton";
import { ContractCode, ContractSuit, Doubling, Level } from "@/model/contract";
import { Direction } from "@/model/common";
import { PlayableContract } from "@/components/pages/play/PlayableContract";
import { SpecialBoardOutcome } from "@/model/result";

export interface ContractEntryPanelProps {
  headerText: string;
  subHeaderText?: string;
  onOk: (contract: ContractCode | SpecialBoardOutcome) => void;
}

export default function ContractEntryPanel({
  headerText,
  subHeaderText,
  onOk,
}: ContractEntryPanelProps) {
  const [level, setLevel] = useState<Level | null>(null);
  const [suit, setSuit] = useState<ContractSuit | null>(null);
  const [declarer, setDeclarer] = useState<Direction | null>(null);
  const [passOut, setPassOut] = useState<boolean>(false);
  const [notPlayed, setNotPlayed] = useState<boolean>(false);
  const [dbl, setDbl] = useState<Doubling>("");

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
    <div className="h-dvh flex flex-col bg-gray-100">
      {/* Context bar */}
      <div className="bg-gray-200 text-gray-800 px-3 py-2 text-base font-semibold shrink-0">
        <div className="truncate">{headerText}</div>
        {subHeaderText && (
          <div className="text-sm text-gray-600">{subHeaderText}</div>
        )}
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
