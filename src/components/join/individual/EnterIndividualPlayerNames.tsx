import { useState } from "react";
import { NewPlayer } from "@/db/games/shared/tables/players";
import PlayerSearch from "@/components/pages/join/PlayerSearch";
import { IndividualSeat } from "@/model/participants";

interface Props {
  seat: IndividualSeat;
  onSubmitPlayer: (player: NewPlayer) => void;
}

export default function EnterIndividualPlayerNames({
  seat,
  onSubmitPlayer,
}: Props) {
  const [player, setPlayer] = useState<NewPlayer | null>(null);

  return (
    <div className="mx-auto max-w-xl h-full flex flex-col">
      <div
        className="
    flex-1
    rounded-2xl
    bg-white
    p-6
    shadow
    flex
    items-center
    justify-center
  "
      >
        <PlayerSearch label="Player" value={player} onChange={setPlayer} />

        <button
          disabled={!player}
          onClick={() => onSubmitPlayer(player!)}
          className="
          mt-4
          w-full
          rounded-xl
          bg-blue-600
          py-3
          text-white
          disabled:opacity-50
        "
        >
          Enter Event
        </button>
      </div>
    </div>
  );
}
