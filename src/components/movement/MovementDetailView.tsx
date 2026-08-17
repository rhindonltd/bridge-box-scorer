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
    <>
      <div className="flex justify-center gap-2 p-3 bg-gray-50 border-b shrink-0">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {viewMode === "byTable"
          ? tables.map((table) => (
              <MovementTable key={table.tableNumber} table={table} />
            ))
          : buildRounds(tables).map((round) => (
              <MovementRound key={round.roundNumber} round={round} />
            ))}
      </div>
    </>
  );
}
