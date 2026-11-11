"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface WizardShellProps {
  /**
   * What the current step asks for (e.g. "Select a board", "Enter Contract"),
   * shown in the grey strip below the header.
   */
  title: string;
  /** Round shown in the header ("Table {table}, Round {round}"). */
  round: number;
  /** Table shown in the header. */
  table: number;
  /** Right-hand content of the step strip (board dropdown or badge). */
  subHeaderRight?: React.ReactNode;
  /** Right-hand content of the header (play menu or a "Director" label). */
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
 * and {@link DirectorContractWizard}). Built on {@link GamePageLayout}:
 *
 * - The header reads "Table {table}, Round {round}" on every step — the same
 *   heading as the round info screen, so the player always sees where they
 *   are — with the event/section subtitles, an optional back arrow, and a
 *   right-hand slot.
 * - A grey strip below it (the layout's `subHeader`) names the current step,
 *   with the board dropdown / badge on the right. Grey rather than
 *   white-on-blue: blue is kept for buttons.
 *
 * The step content fills the remaining height (`contentMode="fill"`) so each
 * step's grow-to-fill button grids and footer buttons keep working. The two
 * wizards differ only in step title, header-right, strip-right, and whether
 * the back arrow shows.
 */
export function WizardShell({
  title,
  round,
  table,
  subHeaderRight,
  headerRight,
  showBack,
  onBack,
  children,
}: WizardShellProps) {
  return (
    <GamePageLayout
      headerTitle={`Table ${table}, Round ${round}`}
      headerRight={headerRight}
      // The back arrow is shown per-step: pass the handler when it should show,
      // and hide the layout's default arrow otherwise.
      hideBack={!showBack}
      backAction={showBack ? onBack : undefined}
      contentMode="fill"
      subHeader={
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2.5 flex items-center justify-between gap-2">
          <h2 className="font-bold text-lg text-gray-900">{title}</h2>
          {subHeaderRight}
        </div>
      }
    >
      {children}
    </GamePageLayout>
  );
}
