"use client";

import { useGame } from "@/context/GameContext";
import {
  Clock,
  PenLine,
  ToggleRight,
  ArrowRightLeft,
  ClipboardList,
  Lock,
  Download,
  Trash2,
} from "lucide-react";

export interface DirectorMenuPageProps {
  onTimerClick: () => void;
  onCorrectResultClick: () => void;
  onChangeStatusClick: () => void;
  onMovementClick: () => void;
  onViewRoundStatusClick: () => void;
  onLockUnlockRoundClick: () => void;
  onExportResultsClick: () => void;
  onDeleteGameClick: () => void;
}

export function DirectorMenuPage({
  onTimerClick,
  onCorrectResultClick,
  onChangeStatusClick,
  onMovementClick,
  onViewRoundStatusClick,
  onLockUnlockRoundClick,
  onExportResultsClick,
  onDeleteGameClick,
}: DirectorMenuPageProps) {
  const { game } = useGame();

  if (!game) return null;

  const standardButtonClass =
    "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

  const deleteButtonClass =
    "w-full py-3.5 text-lg font-semibold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2";

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        {game.eventName}
      </div>

      {/* Menu buttons */}
      <div className="flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
        <button onClick={onTimerClick} className={standardButtonClass}>
          <span className="flex items-center gap-3">
            <Clock size={20} />
            Create/Amend Timer
          </span>
        </button>

        <button onClick={onCorrectResultClick} className={standardButtonClass}>
          <span className="flex items-center gap-3">
            <PenLine size={20} />
            Correct Result
          </span>
        </button>

        <button onClick={onChangeStatusClick} className={standardButtonClass}>
          <span className="flex items-center gap-3">
            <ToggleRight size={20} />
            Change Game Status
          </span>
        </button>

        <button onClick={onMovementClick} className={standardButtonClass}>
          <span className="flex items-center gap-3">
            <ArrowRightLeft size={20} />
            Movement
          </span>
        </button>

        <button
          onClick={onViewRoundStatusClick}
          className={standardButtonClass}
        >
          <span className="flex items-center gap-3">
            <ClipboardList size={20} />
            View Round Status
          </span>
        </button>

        <button
          onClick={onLockUnlockRoundClick}
          className={standardButtonClass}
        >
          <span className="flex items-center gap-3">
            <Lock size={20} />
            Lock/Unlock Round
          </span>
        </button>

        <button onClick={onExportResultsClick} className={standardButtonClass}>
          <span className="flex items-center gap-3">
            <Download size={20} />
            Export Results
          </span>
        </button>

        <div className="mt-6">
          <button onClick={onDeleteGameClick} className={deleteButtonClass}>
            <span className="flex items-center gap-3">
              <Trash2 size={20} />
              Delete Game
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
