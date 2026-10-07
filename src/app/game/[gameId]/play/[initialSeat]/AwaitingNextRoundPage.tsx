import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Spinner } from "@/components/common/Spinner";

interface Props {
  /** How many rounds the player has finished so far (the "Round N complete" line). */
  completedRound: number;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

/**
 * Shown between rounds in a Swiss event when the player has finished every
 * round drawn so far and is waiting for the director to draw the next one.
 * Unlike the move screen there is no Continue button — the player can't advance
 * themselves; the schedule only grows when the director draws. The play flow
 * revalidates on `GAME_UPDATED` (Stage 4), so this screen moves on by itself
 * the moment the next round is drawn.
 */
export function AwaitingNextRoundPage({ completedRound, headerRight }: Props) {
  return (
    <GamePageLayout
      headerTitle="Between rounds"
      headerRight={headerRight}
      hideBack
      centerContent={true}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm md:max-w-md lg:max-w-lg rounded-2xl border border-gray-200 bg-white p-10 md:p-14 text-center shadow-sm">
          <div className="text-lg font-semibold uppercase tracking-wide text-gray-400">
            Round {completedRound} complete
          </div>

          <div className="mt-8 flex justify-center">
            <Spinner size="lg" />
          </div>

          <h1
            className="mt-8 text-2xl md:text-3xl font-bold tracking-tight text-gray-900"
            role="status"
            aria-live="polite"
          >
            Waiting for the director to draw the next round
          </h1>

          <p className="mt-4 text-base text-gray-500">
            Keep this screen open — it will move on by itself. No need to
            refresh.
          </p>
        </div>
      </div>
    </GamePageLayout>
  );
}
