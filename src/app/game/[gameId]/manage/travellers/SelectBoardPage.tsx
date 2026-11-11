"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Spinner } from "@/components/common/Spinner";

interface SelectBoardPageProps {
  boards: number[];
  isLoading: boolean;
  onBoardSelected: (boardNumber: number) => void;
  /** Optional fixed-bottom action bar (e.g. an "Import" shortcut). */
  actions?: React.ReactNode;
}

export function SelectBoardPage({
  boards,
  isLoading,
  onBoardSelected,
  actions,
}: SelectBoardPageProps) {
  return (
    <GamePageLayout headerTitle="Select Board" actions={actions}>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}

        {!isLoading && boards.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 text-base">
            No boards found
          </div>
        )}

        {!isLoading && boards.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 p-6">
            {boards.map((boardNumber) => (
              <button
                key={boardNumber}
                onClick={() => onBoardSelected(boardNumber)}
                data-testid={`select-board-${boardNumber}`}
                // White tiles, matching the players' board picker.
                className="rounded-xl border-2 border-gray-200 bg-white py-4 text-lg font-semibold text-gray-900 hover:bg-gray-50 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {boardNumber}
              </button>
            ))}
          </div>
        )}
      </div>
    </GamePageLayout>
  );
}
