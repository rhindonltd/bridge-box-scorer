"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  roundBoards: number[];
  playedBoards: number[];
  selectedBoard: number | null;
  onBoardSelected: (board: number) => void;
};

export function BoardDropDown({
  roundBoards,
  playedBoards,
  selectedBoard,
  onBoardSelected,
}: Props) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [boardDropdownOpen, setBoardDropdownOpen] = useState(false);

  const handleBoardSelected = (board: number) => {
    setBoardDropdownOpen(false);
    onBoardSelected(board);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!boardDropdownOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setBoardDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [boardDropdownOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setBoardDropdownOpen((v) => !v)}
        className="px-4 py-2 text-lg font-bold bg-white text-blue-900 rounded-lg border-2 border-blue-300 shadow-sm flex items-center gap-1"
      >
        Board {selectedBoard}
        <ChevronDown size={18} />
      </button>

      {boardDropdownOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[140px] overflow-hidden">
          {roundBoards.map((board) => {
            const isPlayed = playedBoards.includes(board);
            const isCurrent = board === selectedBoard;
            return (
              <button
                key={board}
                type="button"
                disabled={isPlayed}
                onClick={() => handleBoardSelected(board)}
                className={`w-full px-4 py-2.5 text-left text-base font-semibold transition
                      ${isCurrent ? "bg-blue-50 text-blue-900" : "text-gray-800 hover:bg-gray-50"}
                      ${isPlayed ? "opacity-40 cursor-not-allowed line-through" : ""}
                    `}
              >
                Board {board}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
