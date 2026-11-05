"use client";

import { ReactNode } from "react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

export interface DirectorMenuPageProps {
  /** Header right-hand content — the play⇄manage switch on a director device. */
  headerRight?: ReactNode;
  onSetUpGameClick: () => void;
  onManageTablesClick: () => void;
  onTravellersClick: () => void;
  onEnterDealsClick: () => void;
  onMovementClick: () => void;
  onShareDirectorAccessClick: () => void;
  onReviewMismatchesClick: () => void;
  /** Open the "Pairs" roster (status of every pair + per-pair actions). */
  onPairsClick: () => void;
  /** Open the "Export & Publish" submenu (USEBIO / PBN / BridgeWebs / EBU). */
  onExportClick: () => void;
  onDeleteGameClick: () => void;
  /** Show "Set Up Game" — only before the game has started. */
  showSetUpGame: boolean;
  /**
   * Show "Manage Tables" — only after the game has started. Routes to the same
   * Tables screen used in setup (`/create`), which also works mid-game for
   * withdrawals / late arrivals.
   */
  showManageTables: boolean;
  /** Show "Travellers" — only after the game has started. */
  showTravellers: boolean;
  /** Show "Enter Deals" — only after the game has started. */
  showEnterDeals: boolean;
  /** Show "Movement" — only after the game has started. */
  showMovement: boolean;
  /**
   * Show "Review Mismatches" — only for a started Swiss game, where a
   * retroactive score adjustment can create an EBU §3.5 mismatch to review.
   */
  showReviewMismatches: boolean;
  /** Show "Pairs" — the roster of every pair's status; only after start. */
  showPairs: boolean;
  /**
   * Show "Export & Publish" — only once the game has started. Opens the submenu
   * holding the results-export / publishing actions; the per-action gating
   * (results complete, BridgeWebs / EBU configured) lives in that submenu.
   */
  showExport: boolean;
}

export function ManageGameMenuPage({
  headerRight,
  onSetUpGameClick,
  onManageTablesClick,
  onTravellersClick,
  onEnterDealsClick,
  onMovementClick,
  onShareDirectorAccessClick,
  onReviewMismatchesClick,
  onPairsClick,
  onExportClick,
  onDeleteGameClick,
  showSetUpGame,
  showManageTables,
  showTravellers,
  showEnterDeals,
  showMovement,
  showReviewMismatches,
  showPairs,
  showExport,
}: DirectorMenuPageProps) {
  const standardButtonClass =
    "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed pl-4";

  const deleteButtonClass =
    "w-full py-3.5 text-lg font-semibold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 pl-4";

  return (
    <GamePageLayout
      headerTitle="Manage Game Menu"
      centerContent={true}
      headerRight={headerRight}
    >
      <div className="flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
        {showSetUpGame && (
          <button onClick={onSetUpGameClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">Set Up Game</span>
          </button>
        )}

        {showManageTables && (
          <button onClick={onManageTablesClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">Manage Tables</span>
          </button>
        )}

        {showTravellers && (
          <button onClick={onTravellersClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">Travellers</span>
          </button>
        )}

        {showEnterDeals && (
          <button onClick={onEnterDealsClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">Enter Deals</span>
          </button>
        )}

        {showMovement && (
          <button onClick={onMovementClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">Movement</span>
          </button>
        )}

        <button
          onClick={onShareDirectorAccessClick}
          className={standardButtonClass}
        >
          <span className="flex items-center gap-3">Share Director Access</span>
        </button>

        {showReviewMismatches && (
          <button
            onClick={onReviewMismatchesClick}
            className={standardButtonClass}
          >
            <span className="flex items-center gap-3">Review Mismatches</span>
          </button>
        )}

        {showPairs && (
          <button onClick={onPairsClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">Pairs</span>
          </button>
        )}

        {showExport && (
          <button onClick={onExportClick} className={standardButtonClass}>
            <span className="flex items-center gap-3">
              Export &amp; Publish
            </span>
          </button>
        )}

        <div className="mt-6">
          <button onClick={onDeleteGameClick} className={deleteButtonClass}>
            <span className="flex items-center gap-3">Delete Game</span>
          </button>
        </div>
      </div>
    </GamePageLayout>
  );
}
