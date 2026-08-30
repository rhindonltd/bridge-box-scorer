"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface SelectBoardPageProps {
  boards: number[];
  isLoading: boolean;
  onBoardSelected: (boardNumber: number) => void;
}

export function SelectBoardPage({
  boards,
  isLoading,
  onBoardSelected,
}: SelectBoardPageProps) {
  return (
    <GamePageLayout
      headerTitle="Select Board"
      children={
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
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
                  className="bg-gray-200 text-gray-800 rounded-xl py-4 text-lg font-semibold hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  {boardNumber}
                </button>
              ))}
            </div>
          )}
        </div>
      }
    />
  );
}
