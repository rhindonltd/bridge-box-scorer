import SelectGame from "@/components/join/SelectGame";
import { Game } from "@/model/common";

interface Props {
  games: Game[];
  onGameSelected: (game: Game) => void;
}

export default function SelectGamePage({ games, onGameSelected }: Props) {
  return (
    <>
      <div className="w-full">
        <div className="bg-blue-200 py-2 text-center font-bold">
          <span>Select Game</span>
        </div>
      </div>
      <SelectGame games={games} onGameSelected={onGameSelected} />
    </>
  );
}
