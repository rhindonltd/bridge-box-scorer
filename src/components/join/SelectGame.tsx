import { Game } from "@/model/common";

interface Props {
  games: Game[];
  onGameSelected: (game: Game) => void;
}

export default function SelectGame({ games, onGameSelected }: Props) {
  return (
    <>
      {games.length === 0 ? (
        <div className="px-4 my-2">
          <p>No games yet. Waiting for director...</p>
        </div>
      ) : (
        <>
          <div className="px-4 my-2">
            <span>Please select the game you wish to join:</span>
          </div>
          <div className="flex flex-col gap-4 px-4 pb-6 max-w-md w-full mx-auto relative z-10">
            {games.map((game) => (
              <button
                onClick={() => onGameSelected(game)}
                className="w-full py-3 text-lg font-semibold bg-blue-300 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition"
              >
                {game.eventName}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
