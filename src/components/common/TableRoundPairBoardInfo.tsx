import React from "react";

type Props = {
  pair?: string;
  round?: number;
  table?: number;
  board?: number;
};

export function TableRoundPairBoardInfo({ round, table, pair, board }: Props) {
  return (
    <>
      <div className="flex flex-col bg-blue-300 py-2">
        <div className="text-center">{pair && <span>Pair {pair}</span>}</div>
        <div className="text-center font-bold">
          {table && <span>Table {table}</span>}
          {round && <span>, Round {round}</span>}
          {board && <span>, Board {board}</span>}
        </div>
      </div>
    </>
  );
}
