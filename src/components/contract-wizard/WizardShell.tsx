"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface WizardShellProps {
  /**
   * Title for the grey header, describing the current step (e.g. "Select
   * Board", "Enter Contract"). The event name and section render beneath it as
   * subtitles via the shared game header.
   */
  title: string;
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
 * and {@link DirectorContractWizard}). Built on {@link GamePageLayout}: the
 * grey header (with a step-specific title, the event/section subtitles, an
 * optional back arrow, and a right-hand slot) comes from the shared layout,
 * while the blue Table/Round sub-header is passed in as the layout's
 * `subHeader`. The step content fills the remaining height (`contentMode="fill"`)
 * so each step's grow-to-fill button grids and footer buttons keep working.
 * The two wizards differ only in title, header-right, sub-header-right, and
 * whether the back arrow shows.
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
      headerTitle={title}
      headerRight={headerRight}
      // The back arrow is shown per-step: pass the handler when it should show,
      // and hide the layout's default arrow otherwise.
      hideBack={!showBack}
      backAction={showBack ? onBack : undefined}
      contentMode="fill"
      subHeader={
        <div className="bg-blue-600 text-white px-3 py-2.5 flex items-center justify-between">
          <span className="font-bold text-lg">
            Table {table}, Round {round}
          </span>
          {subHeaderRight}
        </div>
      }
    >
      {children}
    </GamePageLayout>
  );
}
