"use client";

import { useState } from "react";
import { formatBoards } from "@/movement/shared";

type ViewMode = "byRound" | "byTable";

/**
 * Raw movement table data as returned from the API.
 * Works for both PAIRS (ns/ew) and INDIVIDUAL (n/s/e/w) movements.
 */
export type MovementTableData = {
  tableNumber: number;
  rounds: {
    roundNumber: number;
    ns?: string;
    ew?: string;
    n?: string;
    s?: string;
    e?: string;
    w?: string;
    boardStart: number;
    boardEnd: number;
  }[];
};

type Props = {
  movementName: string;
  movementType: string;
  tables: MovementTableData[];
  onBack: () => void;
  onSelect: () => void;
};

export function MovementDetailView({
  movementName,
  movementType,
  tables,
  onBack,
  onSelect,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("byRound");

  const isPair = movementType !== "INDIVIDUAL";

  return (
    <div className="h-full flex flex-col">
      {/* Header with name and back button */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-100 text-blue-900">
        <button
          onClick={onBack}
          className="px-3 py-1 text-sm bg-white rounded-lg shadow hover:bg-gray-50 transition"
          aria-label="Back to movement list"
        >
          ← Back
        </button>
        <h2 className="flex-1 text-center font-bold text-lg">{movementName}</h2>
      </div>

      {/* Toggle */}
      <div className="flex justify-center gap-2 p-3 bg-gray-50 border-b">
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
              <TableView
                key={table.tableNumber}
                table={table}
                isPair={isPair}
              />
            ))
          : buildRounds(tables).map((round) => (
              <RoundView
                key={round.roundNumber}
                round={round}
                isPair={isPair}
              />
            ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t">
        <button
          onClick={onSelect}
          className="w-full py-3 text-lg font-bold bg-green-700 text-white rounded-xl hover:bg-green-800 transition"
        >
          Select Movement
        </button>
      </div>
    </div>
  );
}

/* ---- Table View ---- */

function TableView({
  table,
  isPair,
}: {
  table: MovementTableData;
  isPair: boolean;
}) {
  return (
    <div className="border rounded-lg shadow-sm overflow-x-auto">
      <div className="bg-blue-600 text-white px-3 py-1.5 font-semibold text-center">
        Table {table.tableNumber}
      </div>
      <table className="w-full table-auto border-collapse text-center text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Round</th>
            {isPair ? (
              <>
                <th className="border px-2 py-1">NS</th>
                <th className="border px-2 py-1">EW</th>
              </>
            ) : (
              <>
                <th className="border px-2 py-1">N</th>
                <th className="border px-2 py-1">S</th>
                <th className="border px-2 py-1">E</th>
                <th className="border px-2 py-1">W</th>
              </>
            )}
            <th className="border px-2 py-1">Boards</th>
          </tr>
        </thead>
        <tbody>
          {table.rounds.map((round) => (
            <tr key={round.roundNumber} className="even:bg-gray-50">
              <td className="border px-2 py-1">{round.roundNumber}</td>
              {isPair ? (
                <>
                  <td className="border px-2 py-1">{round.ns}</td>
                  <td className="border px-2 py-1">{round.ew}</td>
                </>
              ) : (
                <>
                  <td className="border px-2 py-1">{round.n}</td>
                  <td className="border px-2 py-1">{round.s}</td>
                  <td className="border px-2 py-1">{round.e}</td>
                  <td className="border px-2 py-1">{round.w}</td>
                </>
              )}
              <td className="border px-2 py-1">
                {boardRange(round.boardStart, round.boardEnd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---- Round View ---- */

type RoundData = {
  roundNumber: number;
  tables: {
    tableNumber: number;
    ns?: string;
    ew?: string;
    n?: string;
    s?: string;
    e?: string;
    w?: string;
    boardStart: number;
    boardEnd: number;
  }[];
};

function RoundView({
  round,
  isPair,
}: {
  round: RoundData;
  isPair: boolean;
}) {
  return (
    <div className="border rounded-lg shadow-sm overflow-x-auto">
      <div className="bg-blue-600 text-white px-3 py-1.5 font-semibold text-center">
        Round {round.roundNumber}
      </div>
      <table className="w-full table-auto border-collapse text-center text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Table</th>
            {isPair ? (
              <>
                <th className="border px-2 py-1">NS</th>
                <th className="border px-2 py-1">EW</th>
              </>
            ) : (
              <>
                <th className="border px-2 py-1">N</th>
                <th className="border px-2 py-1">S</th>
                <th className="border px-2 py-1">E</th>
                <th className="border px-2 py-1">W</th>
              </>
            )}
            <th className="border px-2 py-1">Boards</th>
          </tr>
        </thead>
        <tbody>
          {round.tables.map((table) => (
            <tr key={table.tableNumber} className="even:bg-gray-50">
              <td className="border px-2 py-1">{table.tableNumber}</td>
              {isPair ? (
                <>
                  <td className="border px-2 py-1">{table.ns}</td>
                  <td className="border px-2 py-1">{table.ew}</td>
                </>
              ) : (
                <>
                  <td className="border px-2 py-1">{table.n}</td>
                  <td className="border px-2 py-1">{table.s}</td>
                  <td className="border px-2 py-1">{table.e}</td>
                  <td className="border px-2 py-1">{table.w}</td>
                </>
              )}
              <td className="border px-2 py-1">
                {boardRange(table.boardStart, table.boardEnd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---- Helpers ---- */

function buildRounds(tables: MovementTableData[]): RoundData[] {
  if (tables.length === 0) return [];

  const roundCount = tables[0].rounds.length;
  const rounds: RoundData[] = [];

  for (let r = 0; r < roundCount; r++) {
    rounds.push({
      roundNumber: r + 1,
      tables: tables.map((t) => ({
        tableNumber: t.tableNumber,
        ...t.rounds[r],
      })),
    });
  }

  return rounds;
}

function boardRange(start: number, end: number): string {
  return start === end ? `${start}` : `${start}-${end}`;
}
