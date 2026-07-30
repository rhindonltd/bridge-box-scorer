import { BridgeGame } from "@/db/game-index/schema";

interface Props {
  games: BridgeGame[];
  isLoading?: boolean;
  onGameSelected: (gameId: string, gameName?: string) => void;
}

export function ManageGameList({ games, isLoading, onGameSelected }: Props) {
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        Manage Games
      </div>

      {/* Game list */}
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
                  <StatusBadge status={game.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    JOINABLE: "bg-green-100 text-green-800",
    CREATED: "bg-yellow-100 text-yellow-800",
    COMPLETE: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status.toLowerCase()}
    </span>
  );
}
