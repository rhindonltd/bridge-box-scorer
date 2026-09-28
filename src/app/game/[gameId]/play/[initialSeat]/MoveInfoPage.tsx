import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface Props {
  roundNumber: number;
  /**
   * The table to go to next: the destination when moving, or the table the
   * sit-out is at (where the phantom pair sits). May be null for a padded
   * sit-out round the pair has no table for at all.
   */
  tableNumber: number | null;
  /** Which side the pair sits at the next table (they can switch between rounds). */
  side?: "NS" | "EW";
  sitOut: boolean;
  onMoveInfoContinue: () => void;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

/** Human-readable seating direction for a side. */
const SIDE_LABEL: Record<"NS" | "EW", string> = {
  NS: "North / South",
  EW: "East / West",
};

export function MoveInfoPage({
  roundNumber,
  tableNumber,
  side,
  sitOut,
  onMoveInfoContinue,
  headerRight,
}: Props) {
  // If the next round is a sit-out, skip the "move to table" screen
  if (sitOut) {
    return (
      <GamePageLayout
        headerTitle="Move Info"
        headerRight={headerRight}
        hideBack
        centerContent={true}
        actions={
          <button
            onClick={onMoveInfoContinue}
            className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Continue
          </button>
        }
      >
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm md:max-w-md lg:max-w-lg rounded-2xl border border-gray-200 bg-white p-10 md:p-14 text-center shadow-sm">
            <div className="text-lg font-semibold uppercase tracking-wide text-gray-400">
              Round {roundNumber}
            </div>
            <div className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
              Sit Out
            </div>
            {tableNumber != null && (
              <div className="mt-4 text-2xl md:text-3xl font-medium text-gray-500">
                at Table {tableNumber}
              </div>
            )}
          </div>
        </div>
      </GamePageLayout>
    );
  }

  return (
    <GamePageLayout
      headerTitle="Move Info"
      headerRight={headerRight}
      hideBack
      centerContent={true}
      actions={
        <button
          onClick={onMoveInfoContinue}
          className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Continue
        </button>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm md:max-w-md lg:max-w-lg rounded-2xl border border-gray-200 bg-white p-10 md:p-14 text-center shadow-sm">
          <div className="text-lg font-semibold uppercase tracking-wide text-gray-400">
            Round {roundNumber}
          </div>

          <div className="mt-6 text-2xl md:text-3xl font-medium text-gray-500">
            Move to
          </div>
          <div className="mt-2 text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
            Table {tableNumber}
          </div>

          {side && (
            <div className="mt-8 flex flex-col items-center border-t border-gray-100 pt-8">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-5 py-2 text-xl md:text-2xl font-bold text-blue-700">
                Sit {SIDE_LABEL[side]}
              </span>
            </div>
          )}
        </div>
      </div>
    </GamePageLayout>
  );
}
