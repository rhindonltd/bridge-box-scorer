import React, { useState, useRef, useEffect } from "react";
import { Traveller } from "@/components/results/traveller/Traveller";
import { ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { PlayHeader } from "@/components/play/PlayHeader";
import { ChevronDown } from "lucide-react";

interface Props {
  board: number;
  playedBoards: number[];
  lastBoardOfRound: boolean;
  scoredTraveller: ScoredTraveller;
  onBoardSelected: (board: number) => void;
  onNext: () => void;
}

export function BoardResultsPage({
  board,
  playedBoards,
  lastBoardOfRound,
  scoredTraveller,
  onBoardSelected,
  onNext,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const otherBoards = playedBoards.filter((b) => b !== board);
  const hasMultipleBoards = otherBoards.length > 0;

  const boardSelector = hasMultipleBoards ? (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-4 py-1.5 text-lg font-bold bg-white text-blue-900 rounded-lg border-2 border-blue-300 shadow-sm hover:bg-blue-50 active:scale-[0.98] transition"
        aria-expanded={dropdownOpen}
        aria-haspopup="listbox"
      >
        Board {board}
        <ChevronDown size={18} />
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[120px]">
          {playedBoards.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => {
                onBoardSelected(b);
                setDropdownOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-base font-medium transition ${
                b === board
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-800 hover:bg-gray-100"
              }`}
            >
              Board {b}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : (
    <span className="inline-flex items-center px-4 py-1.5 text-lg font-bold bg-white text-blue-900 rounded-lg border-2 border-blue-300 shadow-sm">
      Board {board}
    </span>
  );

  return (
    <div className="flex-1 flex flex-col">
      <PlayHeader detailContent={boardSelector} />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <Traveller scoredTraveller={scoredTraveller} />
      </div>

      <div className="p-2 shrink-0">
        <button
          onClick={onNext}
          className="w-full py-3 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {lastBoardOfRound ? "Next Round" : "Next Board"}
        </button>
      </div>
    </div>
  );
}
