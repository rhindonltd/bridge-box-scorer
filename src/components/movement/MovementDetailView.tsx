"use client";

import { useState } from "react";
import { buildRounds, MovementByTable } from "@/movement/movementData";
import { MovementTable } from "./MovementTable";
import { MovementRound } from "./MovementRound";

type ViewMode = "byRound" | "byTable";

type Props = {
  tables: MovementByTable[];
};

export function MovementDetailView({ tables }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("byRound");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex justify-center w-full flex-row p-3 bg-gray-50 border-b gap-2 shrink-0 px-4 pt-2">
        <button
          onClick={() => setViewMode("byRound")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === "byRound"
              ? "bg-blue-600 text-white"
              : "bg-white border text-gray-700 hover:bg-gray-100"
          }`}
        >
          By Round
        </button>
        <button
          onClick={() => setViewMode("byTable")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            viewMode === "byTable"
              ? "bg-blue-600 text-white"
              : "bg-white border text-gray-700 hover:bg-gray-100"
          }`}
        >
          By Table
        </button>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {viewMode === "byTable"
          ? tables.map((table) => (
              <MovementTable key={table.tableNumber} table={table} />
            ))
          : buildRounds(tables).map((round) => (
              <MovementRound key={round.roundNumber} round={round} />
            ))}
      </div>
    </div>
  );
}
