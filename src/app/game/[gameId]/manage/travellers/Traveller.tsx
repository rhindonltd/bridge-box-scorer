"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { BoardResult as ContractDisplay } from "@/components/traveller/BoardResult";
import { BoardInstance } from "@/model/participants";
import { BoardOutcome } from "@/model/score";

interface TravellerViewProps {
  boardNumber: number;
  instances: BoardInstance[];
  isLoading: boolean;
  onLineSelected: (instance: BoardInstance) => void;
  onBack: () => void;
}

/**
 * Traveller — shows a board's traveller as a tappable table.
 * Columns: NS, EW, Contract (for pairs).
 * No "Table" column. Player names are shown below pair numbers.
 * Tapping a row selects that line for correction.
 */
export function Traveller({
  boardNumber,
  instances,
  isLoading,
  onLineSelected,
  onBack,
}: TravellerViewProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-200 text-gray-800 shrink-0">
          <button
            onClick={onBack}
            className="px-3 py-1 text-sm bg-white rounded-lg shadow hover:bg-gray-50 transition"
            aria-label="Back to board list"
          >
            &larr; Back
          </button>
          <h2 className="flex-1 text-center font-bold text-lg">
            Board {boardNumber}
          </h2>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const isPair = true;

  return (
    <GamePageLayout headerTitle="Travellers" backAction={onBack}>
      <div className="flex-1 overflow-y-auto p-4">
        {instances.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            No results for this board yet
          </div>
        )}

        {instances.length > 0 && (
          <>
            <div className="mb-2 font-bold">Tap a row to adjust the result</div>
            <div className="border rounded-lg shadow-sm overflow-x-auto">
              <table className="w-full table-auto border-collapse text-center text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    {isPair ? (
                      <>
                        <th className="border px-2 py-1.5">NS</th>
                        <th className="border px-2 py-1.5">EW</th>
                      </>
                    ) : (
                      <>
                        <th className="border px-2 py-1.5">N</th>
                        <th className="border px-2 py-1.5">S</th>
                        <th className="border px-2 py-1.5">E</th>
                        <th className="border px-2 py-1.5">W</th>
                      </>
                    )}
                    <th className="border px-2 py-1.5">Contract</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance) => (
                    <tr
                      key={`${instance.roundNumber}-${instance.tableNumber}`}
                      onClick={() => onLineSelected(instance)}
                      data-testid={`traveller-row-${instance.roundNumber}-${instance.tableNumber}`}
                      className="cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition"
                    >
                      {isPair && instance.participants.type === "PAIRS" ? (
                        <>
                          <td className="border px-2 py-2">
                            <div className="font-medium">
                              {instance.participants.ns}
                            </div>
                            {instance.participants.nsNames && (
                              <div className="text-xs text-gray-500">
                                {instance.participants.nsNames}
                              </div>
                            )}
                          </td>
                          <td className="border px-2 py-2">
                            <div className="font-medium">
                              {instance.participants.ew}
                            </div>
                            {instance.participants.ewNames && (
                              <div className="text-xs text-gray-500">
                                {instance.participants.ewNames}
                              </div>
                            )}
                          </td>
                        </>
                      ) : null}
                      <td className="border px-2 py-2 font-medium">
                        {instance.currentResult ? (
                          <ContractDisplay
                            boardOutcome={
                              instance.currentResult as BoardOutcome
                            }
                          />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </GamePageLayout>
  );
}
