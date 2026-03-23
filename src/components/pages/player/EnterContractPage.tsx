"use client";

import React, { useState } from "react";

import Level from "@/components/player/contract/Level";
import Suit from "@/components/player/contract/Suit";
import Declarer from "@/components/player/contract/Declarer";
import Double from "@/components/player/contract/Double";
import Header from "@/components/player/contract/Header";
import SubmitButton from "@/components/player/contract/SubmitButton";
import PassOutButton from "@/components/player/contract/PassOutButton";
import NumberStepper from "@/components/common/NumberStepper";
import { HeaderContentButtonLayout } from "@/components/layout/HeaderContentButtonLayout";
import NotPlayedButton from "@/components/player/contract/NotPlayedButton";

type Props = {
  board: number;
  roundBoards: number[];
};

export default function EnterContractPage({ board, roundBoards }: Props) {
  const [level, setLevel] = useState<number | null>(null);
  const [suit, setSuit] = useState<string | null>(null);
  const [declarer, setDeclarer] = useState<string | null>(null);
  const [dbl, setDbl] = useState("");
  const [result, setResult] = useState(0);

  const adjustResult = (value: number) => {
    setResult((r) => Math.max(-13, Math.min(7, value)));
  };

  const submitResult = () => {
    // TODO
  };

  const onPassOut = () => {
    // TODO
  };

  const onNotPlayed = () => {
    // TODO
  };

  const setBoard = (board) => {};

  const contract =
    level && suit ? `${level}${suit}${dbl} by ${declarer ?? "?"}` : "-";

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* TOP GRID (unchanged layout you liked) */}
      <div className="grid grid-cols-2 w-full items-stretch">
        <div className="flex flex-col bg-blue-200">
          <div className="p-2 text-center font-bold">Monday PM Pairs</div>
          <div className="p-2 text-center">Round 1 - Table 2</div>
        </div>

        <div className="flex flex-col items-center justify-center bg-blue-300">
          <span className="text-sm font-medium">Board</span>
          <select
            className="p-1 border rounded-md bg-white text-center"
            value={board}
            onChange={(e) => setBoard(Number(e.target.value))}
          >
            {roundBoards.map((roundBoard) => (
              <option key={roundBoard} value={roundBoard}>
                {roundBoard}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col justify-center gap-1 p-1">
          <PassOutButton onPassOut={onPassOut} className="py-1 text-sm" />
          <NotPlayedButton onNotPlayed={onNotPlayed} className="py-1 text-sm" />
        </div>

        <div className="flex items-center justify-center bg-gray-300 text-3xl font-semibold">
          {contract}
        </div>
      </div>

      {/* MIDDLE: 2x2 CONTROLS (fills ALL remaining space) */}
      <div className="flex-1 min-h-0 p-2">
        <div
          className="
    grid grid-cols-2 grid-rows-2
    gap-x-2 gap-y-3
    md:h-full md:auto-rows-fr
  "
        >
          <div className="h-full">
            <Level level={level} onLevelSelected={setLevel} />
          </div>

          <div className="h-full">
            <Suit suit={suit} onSuitSelected={setSuit} />
          </div>

          <div className="h-full">
            <Declarer declarer={declarer} onDeclarerSelected={setDeclarer} />
          </div>

          <div className="h-full">
            <Double dbl={dbl} onDblSelected={setDbl} />
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="p-2">
        <SubmitButton onSubmit={submitResult} />
      </div>
    </div>
  );
}
