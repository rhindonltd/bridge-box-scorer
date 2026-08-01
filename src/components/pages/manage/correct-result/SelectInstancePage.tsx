"use client";

import { useGame } from "@/context/GameContext";

interface PairsParticipants {
  type: "PAIRS";
  ns: string;
  ew: string;
  nsNames?: string | null;
  ewNames?: string | null;
}

interface IndividualParticipants {
  type: "INDIVIDUAL";
  n: string;
  s: string;
  e: string;
  w: string;
  nName?: string | null;
  sName?: string | null;
  eName?: string | null;
  wName?: string | null;
}

export interface BoardInstance {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  participants: PairsParticipants | IndividualParticipants;
  currentResult: string | null;
  status: string | null;
}

interface SelectInstancePageProps {
  boardNumber: number;
  instances: BoardInstance[];
  isLoading: boolean;
  onInstanceSelected: (instance: BoardInstance) => void;
}

export function SelectInstancePage({
  boardNumber,
  instances,
  isLoading,
  onInstanceSelected,
}: SelectInstancePageProps) {
  const { game } = useGame();

  if (!game) return null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        {game.eventName}
      </div>

      {/* Sub-header */}
      <div className="bg-blue-600 text-white px-3 py-2.5 text-center font-bold text-lg">
        Board {boardNumber}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}

        {!isLoading && instances.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 text-base">
            No instances found for this board
          </div>
        )}

        {!isLoading && instances.length > 0 && (
          <div className="flex flex-col gap-2">
            {instances.map((instance) => (
              <button
                key={`${instance.roundNumber}-${instance.tableNumber}`}
                onClick={() => onInstanceSelected(instance)}
                className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="font-semibold text-base text-gray-900">
                  Table {instance.tableNumber}, Round {instance.roundNumber}
                </div>
                <div className="text-sm text-gray-600">
                  {instance.participants.type === "PAIRS" ? (
                    <>
                      NS: {instance.participants.ns} vs EW:{" "}
                      {instance.participants.ew}
                    </>
                  ) : (
                    <>
                      N: {instance.participants.n}, S: {instance.participants.s},
                      E: {instance.participants.e}, W: {instance.participants.w}
                    </>
                  )}
                </div>
                {instance.currentResult && (
                  <div className="text-sm flex items-center gap-2 mt-1">
                    <span className="text-gray-600">
                      Result: {instance.currentResult}
                    </span>
                    {instance.status === "OVERRIDDEN" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        overridden
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
