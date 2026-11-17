"use client";

import type { ReactNode } from "react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

export interface ExportGamePageProps {
  onDownloadUsebioClick: () => void;
  onDownloadPbnClick: () => void;
  /**
   * Set (to true) when the club name / EBU number are missing. Shown to
   * directors only: they can fix it in Settings, and a download would fail
   * without it.
   */
  showClubWarning: boolean;
  /** Director-only actions (uploads, tournament level, reopen), when shown. */
  directorSection?: ReactNode;
}

const buttonClass =
  "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed pl-4";

/**
 * The export page of a finalised game. Downloads are open to everyone (players
 * included); the director-only actions arrive through `directorSection`.
 */
export function ExportGamePage({
  onDownloadUsebioClick,
  onDownloadPbnClick,
  showClubWarning,
  directorSection,
}: ExportGamePageProps) {
  return (
    <GamePageLayout headerTitle="Export Game" centerContent backHref="/export">
      <div className="flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
        {showClubWarning && (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            The club name and EBU number are not set, so the results file
            can&rsquo;t be created. Set them in Settings → EBU.
          </p>
        )}
        <button onClick={onDownloadUsebioClick} className={buttonClass}>
          <span className="flex items-center gap-3">Download USEBIO</span>
        </button>
        <button onClick={onDownloadPbnClick} className={buttonClass}>
          <span className="flex items-center gap-3">Download PBN</span>
        </button>
        {directorSection}
      </div>
    </GamePageLayout>
  );
}
