import { Tables } from "@/model/movement";
import MovementTables from "@/components/movement/MovementTables";
import React from "react";
import { GameInfo } from "@/components/common/GameInfo";

type Props = {
  movementName: string;
  tables: Tables<"PAIR">;
  onCreate: () => void;
};

export function MovementDetailsPage({ movementName, tables, onCreate }: Props) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-row w-full">
        <GameInfo />
      </div>

      {/* Movement name */}
      <div className="w-full">
        <div className="flex flex-col bg-blue-100 text-blue-900 py-2">
          <div className="text-center font-bold">
            <span>{movementName}</span>
          </div>
        </div>
      </div>

      {/* Scrollable tables */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <MovementTables tables={tables} />
      </div>

      {/* Footer button */}
      <div className="p-2">
        <button
          className="w-full mt-3 p-3 text-lg bg-green-700 text-white rounded-xl"
          onClick={onCreate}
        >
          Create
        </button>
      </div>
    </div>
  );
}
