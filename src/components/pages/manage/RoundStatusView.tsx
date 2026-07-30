"use client";

import { TableRoundStatus } from "@/lib/round-status";

interface RoundStatusViewProps {
  eventName: string;
  tables: TableRoundStatus[];
  isLoading: boolean;
}

export function RoundStatusView({ eventName, tables, isLoading }: RoundStatusViewProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        {eventName}
      </div>

      {/* Sub-header */}
      <div className="bg-blue-600 text-white px-3 py-2.5 text-center font-bold text-lg">
        Round Status
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}

        {!isLoading && tables.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 text-base">
            No boards found — movement may not be set up yet.
          </div>
        )}

        {!isLoading && tables.length > 0 && (
          <div className="flex flex-col gap-2">
            {tables.map((table) => (
              <div
                key={table.tableNumber}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-base text-gray-900">
                    Table {table.tableNumber}
                  </span>
                  {table.currentRound > 0 && table.boardsEntered === table.boardsTotal && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Complete
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 mt-1">
                  {table.currentRound > 0
                    ? `Round ${table.currentRound} — ${table.boardsEntered}/${table.boardsTotal} boards`
                    : "No scores entered"}
                </div>

                {table.hasMissingPreviousRounds && (
                  <div className="mt-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Missing: Round {table.missingRounds.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
