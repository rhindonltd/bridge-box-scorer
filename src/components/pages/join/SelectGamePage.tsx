import SelectGame from "@/components/join/SelectGame";
import { BridgeGame } from "@/db/game-index/schema";

interface Props {
  games: BridgeGame[] | undefined;
  onGameSelected: (game: BridgeGame) => void;
}

export default function SelectGamePage({ games, onGameSelected }: Props) {
  return (
    <>
      <div className="w-full">
        <div className="bg-blue-200 py-2 text-center font-bold">
          <span>Select Game</span>
        </div>
      </div>
      {games && <SelectGame games={games} onGameSelected={onGameSelected} />}
    </>
  );
}
