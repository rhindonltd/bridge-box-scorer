"use client";

import React, { useState } from "react";

import LevelSection from "@/components/player/contract/LevelSection";
import SuitSection from "@/components/player/contract/SuitSection";
import DeclarerSection from "@/components/player/contract/DeclarerSection";
import DoubleSection from "@/components/player/contract/DoubleSection";
import Header from "@/components/player/contract/Header";
import SubmitButton from "@/components/player/contract/SubmitButton";
import PassOutButton from "@/components/player/contract/PassOutButton";
import NumberStepper from "@/components/common/NumberStepper";
import { HeaderContentButtonLayout } from "@/components/layout/HeaderContentButtonLayout";
import NotPlayedButton from "@/components/player/contract/NotPlayedButton";
import {ContractCode, ContractSuit, ContractSuits, Doubling, Level} from "@/model/contract";
import {SpecialBoardOutcome} from "@/model/score-traveller";
import {Direction, Suit} from "@/model/common";

export type BoardAndContract = {
    board: number;
    contract: ContractCode | SpecialBoardOutcome;
}

type Props = {
  board: number;
  roundBoards: number[];
  onOk: (boardAndContract: BoardAndContract) => void;
};

export default function EnterContractPage({ board, roundBoards, onOk }: Props) {
  const [level, setLevel] = useState<Level | null>(null);
  const [suit, setSuit] = useState<ContractSuit | null>(null);
  const [declarer, setDeclarer] = useState<Direction | null>(null);
  const [passOut, setPassOut] = useState<boolean>(false);
  const [notPlayed, setNotPlayed] = useState<boolean>(false);
  const [dbl, setDbl] = useState<Doubling>("");
  const [currentBoard, setCurrentBoard] = useState(board);
  // const [result, setResult] = useState(0);

  // const adjustResult = (value: number) => {
  //   setResult((r) => Math.max(-13, Math.min(7, value)));
  // };

  const handleOnOK = () => {
    if (passOut) {
        onOk({
            board: currentBoard,
            contract: 'PO'
        })
    }

    if (notPlayed) {
        onOk({
            board: currentBoard,
            contract: 'NP'
        })
    }

    if (level !== null && suit !== null && dbl !== null && declarer !== null) {
        onOk({
            board: currentBoard,
            contract: `${level}${suit}${dbl}${declarer}`
        })
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

  const contract =
      notPlayed ?  'Not Played' :
          passOut ?  'Pass Out' :
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
            onChange={(e) => setCurrentBoard(Number(e.target.value))}
          >
            {roundBoards.map((roundBoard) => (
              <option key={roundBoard} value={roundBoard}>
                {roundBoard}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col justify-center gap-1 p-1">
          <PassOutButton onPassOut={onPassOut} />
          <NotPlayedButton onNotPlayed={onNotPlayed} />
        </div>

        <div className="flex items-center justify-center bg-gray-300 text-3xl font-semibold">
          {contract}
        </div>
      </div>

      {/* MIDDLE: 2x2 CONTROLS (fills ALL remaining space) */}
        <div className="flex-1 min-h-0 p-2">
            <div className="
    grid grid-cols-2 grid-rows-2
    gap-x-2 gap-y-3
    md:h-full md:auto-rows-fr
  ">

                <div className="h-full flex">
                    <LevelSection className="flex-1" level={level} onLevelSelected={onLevelSelected} />
                </div>

                <div className="h-full flex">
                    <SuitSection className="flex-1" suit={suit} onSuitSelected={onSuitSelected} />
                </div>

                <div className="h-full flex">
                    <DeclarerSection className="flex-1" declarer={declarer} onDeclarerSelected={onDeclarerSelected} />
                </div>

                <div className="h-full flex">
                    <DoubleSection className="flex-1" dbl={dbl} onDblSelected={onDblSelected} />
                </div>

            </div>
        </div>

      {/* BOTTOM */}
      <div className="p-2">
        <SubmitButton onSubmit={handleOnOK} />
      </div>
    </div>
  );
}
