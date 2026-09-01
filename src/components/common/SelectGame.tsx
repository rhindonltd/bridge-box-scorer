import { PageLayout } from "@/components/layout/PageLayout";
import { BridgeGame } from "@/db/game-index/schema";

interface Props {
  headerTitle: string;
  games: BridgeGame[];
  isLoading?: boolean;
  onGameSelected: (gameId: string, gameName?: string) => void;
}

export function SelectGame({
  headerTitle,
  games,
  isLoading,
  onGameSelected,
}: Props) {
  return (
    <PageLayout headerTitle={headerTitle}>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}

        {!isLoading && games.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 text-base">
            No games have been created yet.
          </div>
        )}

        {!isLoading && games.length > 0 && (
          <div className="flex flex-col gap-2 p-4">
            {games.map((game) => (
              <button
                key={game.gameId}
                onClick={() => onGameSelected(game.gameId, game.eventName)}
                className="w-full text-left px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="font-semibold text-base text-gray-900">
                  {game.eventName}
                </div>
                <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{formatDate(game.eventDate)}</span>
                  <span>·</span>
                  <span>{game.tables} tables</span>
                  <span>·</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
