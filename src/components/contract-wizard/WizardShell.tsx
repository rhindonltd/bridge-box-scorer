"use client";

import { ArrowLeft } from "lucide-react";
import { useRequiredGame } from "@/context/GameContext";

interface WizardShellProps {
  /** Round shown in the blue sub-header ("Table {table}, Round {round}"). */
  round: number;
  /** Table shown in the blue sub-header. */
  table: number;
  /** Right-hand content of the blue sub-header (board dropdown or badge). */
  subHeaderRight?: React.ReactNode;
  /** Right-hand content of the grey header (play menu or a "Director" label). */
  headerRight?: React.ReactNode;
  /** Whether the back arrow is shown. */
  showBack: boolean;
  /** Invoked when the back arrow is pressed. */
  onBack: () => void;
  /** The current step's content. */
  children: React.ReactNode;
}

/**
 * Shared chrome for the contract-entry wizards (player {@link ContractWizard}
 * and {@link DirectorContractWizard}). Renders the grey event header (with an
 * optional back arrow and a right-hand slot) and the blue Table/Round
 * sub-header (with a right-hand slot), then the step content beneath. The two
 * wizards differ only in what fills those slots and whether the back arrow
 * shows, so that chrome lives here once rather than being copy-pasted.
 */
export function WizardShell({
  round,
  table,
  subHeaderRight,
  headerRight,
  showBack,
  onBack,
  children,
}: WizardShellProps) {
  const { game } = useRequiredGame();

  return (
    <div className="flex-1 flex flex-col">
      {/* Header (grey bar) */}
      <div className="bg-gray-200 text-gray-800 px-3 py-2 flex items-center gap-2 shrink-0">
        {showBack && (
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-300 transition"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex-1 flex items-start justify-between min-w-0">
          <div className="truncate">
            <div className="font-semibold">{game.eventName}</div>
            {(game.sessionName || game.sectionName) && (
              <div className="text-sm text-gray-600">
                {game.sessionName}
                {game.sessionName && game.sectionName && ", "}
                {game.sectionName}
              </div>
            )}
          </div>
          {headerRight}
        </div>
      </div>

      {/* Sub-header (blue bar) */}
      <div className="bg-blue-600 text-white px-3 py-2.5 flex items-center justify-between shrink-0">
        <span className="font-bold text-lg">
          Table {table}, Round {round}
        </span>
        {subHeaderRight}
      </div>

      {children}
    </div>
  );
}
