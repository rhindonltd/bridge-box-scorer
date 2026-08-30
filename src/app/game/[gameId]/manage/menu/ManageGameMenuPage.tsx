"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";

export interface DirectorMenuPageProps {
  onSetUpGameClick: () => void;
  onTravellersClick: () => void;
  onMovementClick: () => void;
  onShareDirectorAccessClick: () => void;
  onDownloadUsebioClick: () => void;
  onDeleteGameClick: () => void;
}

export function ManageGameMenuPage({
  onSetUpGameClick,
  onTravellersClick,
  onMovementClick,
  onShareDirectorAccessClick,
  onDownloadUsebioClick,
  onDeleteGameClick,
}: DirectorMenuPageProps) {

  const standardButtonClass =
    "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 pl-4";

  const deleteButtonClass =
    "w-full py-3.5 text-lg font-semibold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 pl-4";

  return (
    <GamePageLayout
      headerTitle="Manage Game Menu"
      centerContent={true}
      children={
        <div className="flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
          <button onClick={onSetUpGameClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">Set Up Game</span>
          </button>

          <button onClick={onTravellersClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">Travellers</span>
          </button>

          <button onClick={onMovementClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">Movement</span>
          </button>

          <button
            onClick={onShareDirectorAccessClick}
            className={standardButtonClass}
          >
            <span className="flex items-center gap-3">
              Share Director Access
            </span>
          </button>

          <button
            onClick={onDownloadUsebioClick}
            className={standardButtonClass}
          >
            <span className="flex items-center gap-3">Download USEBIO</span>
          </button>

          <div className="mt-6">
            <button onClick={onDeleteGameClick} className={deleteButtonClass}>
              <span className="flex items-center gap-3">Delete Game</span>
            </button>
          </div>
        </div>
      }
    />
  );
}
