import { useState } from "react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Spinner } from "@/components/common/Spinner";
import { BoardResult } from "@/components/traveller/BoardResult";
import type { BoardOutcome } from "@/model/score";

interface Props {
  boardNumber: number;
  /**
   * The result this player just entered (e.g. "3NTN=", "PO", "NP"), shown so
   * they can check it while waiting. Omitted when not known.
   */
  result?: string;
  /**
   * Back out to re-enter the result (the entry was wrong). Should clear the
   * submitted entry server-side and then leave this screen; rejects if it can't
   * (e.g. the board was confirmed meanwhile). When omitted there is no back
   * arrow.
   */
  onBack?: () => Promise<void> | void;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

/** "Pass Out" / "Not Played" in words (as the contract wizard says them). */
const SPECIAL_LABEL: Record<string, string> = {
  PO: "Pass Out",
  NP: "Not Played",
};

export function WaitingForConfirmation({
  boardNumber,
  result,
  onBack,
  headerRight,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = async () => {
    if (busy || !onBack) return;
    setBusy(true);
    setError(null);
    try {
      await onBack();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't go back. Please try again.",
      );
      setBusy(false);
    }
  };

  return (
    <GamePageLayout
      headerTitle={`Board ${boardNumber}`}
      headerRight={headerRight}
      hideBack={!onBack || busy}
      backAction={onBack ? handleBack : undefined}
      centerContent={true}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <Spinner size="lg" className="mb-4" />
        <div className="text-xl font-semibold text-gray-900">
          Waiting for confirmation
        </div>
        <div className="text-base text-gray-500 mt-2 text-center">
          The other pair needs to enter their result for this board.
        </div>

        {result && (
          <div
            className="mt-6 w-full max-w-xs rounded-xl border-2 border-gray-200 bg-white px-6 py-4 text-center"
            data-testid="waiting-entered-result"
          >
            <div className="text-sm font-medium text-gray-600">You entered</div>
            <div className="mt-1 text-3xl font-bold text-gray-900">
              {SPECIAL_LABEL[result] ?? (
                <BoardResult boardOutcome={result as BoardOutcome} />
              )}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 text-center text-base font-medium text-red-700"
          >
            {error}
          </div>
        )}
      </div>
    </GamePageLayout>
  );
}
