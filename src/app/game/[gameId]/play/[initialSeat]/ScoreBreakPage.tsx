import { GamePageLayout } from "@/components/layout/GamePageLayout";

interface Props {
  /** The team's home table, where its two pairs score up. */
  homeTable: number;
  /** Whether this is the team's away (East/West) pair, which goes back home. */
  away: boolean;
  onContinue: () => void;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

/**
 * The teams score break: the round just played ends a score break, so the away
 * pair goes back to its home table to score up with its team-mates, and the
 * home pair waits for it there. Continuing shows the team results.
 */
export function ScoreBreakPage({
  homeTable,
  away,
  onContinue,
  headerRight,
}: Props) {
  return (
    <GamePageLayout
      headerTitle="Score Break"
      headerRight={headerRight}
      hideBack
      centerContent={true}
      actions={
        <button
          onClick={onContinue}
          data-testid="score-break-continue"
          className="w-full py-3.5 text-lg font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Continue
        </button>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div
          data-testid="score-break"
          className="w-full max-w-sm md:max-w-md lg:max-w-lg rounded-2xl border border-gray-200 bg-white p-10 md:p-14 text-center shadow-sm"
        >
          <div className="text-lg font-semibold uppercase tracking-wide text-gray-500">
            Score break
          </div>
          {away ? (
            <>
              <div className="mt-6 text-2xl md:text-3xl font-medium text-gray-500">
                Go back to your home table
              </div>
              <div className="mt-2 text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
                Table {homeTable}
              </div>
              <div className="mt-6 text-xl md:text-2xl font-medium text-gray-500">
                to score up with your team-mates.
              </div>
            </>
          ) : (
            <>
              <div className="mt-6 text-2xl md:text-3xl font-medium text-gray-500">
                Your team-mates are coming back to
              </div>
              <div className="mt-2 text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
                Table {homeTable}
              </div>
              <div className="mt-6 text-xl md:text-2xl font-medium text-gray-500">
                to score up.
              </div>
            </>
          )}
        </div>
      </div>
    </GamePageLayout>
  );
}
