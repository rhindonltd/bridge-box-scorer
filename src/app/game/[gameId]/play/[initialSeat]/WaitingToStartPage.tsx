import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { parseSeat, Seat } from "@/model/participants";
import { PairDirection } from "@/model/common";
import { useSections } from "@/hooks/sections";

interface Props {
  gameId: string;
  /** The seat the player took (section-qualified, e.g. "A3NS"). */
  seat: Seat;
}

const DIRECTION_LABEL: Record<PairDirection, string> = {
  NS: "North–South",
  EW: "East–West",
};

/**
 * Shown to a seated player while the game has not yet been started by the
 * director. Their schedule only exists once the movement is materialized at
 * start, so instead of an indefinite spinner we confirm their seat and tell
 * them what to expect. `usePlayFlow` revalidates on `GAME_UPDATED`, so this
 * screen advances into play automatically the moment the director starts.
 */
export function WaitingToStartPage({ gameId, seat }: Props) {
  const { sections } = useSections(gameId);

  let section: string | null = null;
  let tableNumber: number | null = null;
  let direction: PairDirection | null = null;
  try {
    const parsed = parseSeat(seat);
    section = parsed.section;
    tableNumber = parsed.tableNumber;
    direction = parsed.direction;
  } catch {
    // Fall back to a seat-less message if the seat can't be parsed.
  }

  // Only surface the section when the game actually has more than one, so
  // single-section games don't show a meaningless "Section A".
  const showSection = sections.length > 1 && section != null;

  return (
    <GamePageLayout headerTitle="You're seated" centerContent={true}>
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div
          className="mb-6 h-3 w-3 animate-pulse rounded-full bg-blue-600"
          aria-hidden="true"
        />

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Waiting for the director to start the game
        </h1>

        {tableNumber != null && direction != null ? (
          <p className="mb-6 text-base text-gray-600">
            You&rsquo;re seated{showSection ? ` in Section ${section}` : ""} at{" "}
            <span className="font-semibold text-gray-900">
              Table {tableNumber}
            </span>
            , playing{" "}
            <span className="font-semibold text-gray-900">
              {DIRECTION_LABEL[direction]}
            </span>
            .
          </p>
        ) : (
          <p className="mb-6 text-base text-gray-600">
            You&rsquo;re seated and ready to play.
          </p>
        )}

        <p
          className="max-w-sm text-sm text-gray-500"
          role="status"
          aria-live="polite"
        >
          Keep this screen open — it will move on by itself as soon as the game
          starts. No need to refresh.
        </p>
      </div>
    </GamePageLayout>
  );
}
