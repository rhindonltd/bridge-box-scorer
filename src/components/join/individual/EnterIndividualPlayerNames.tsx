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
    <div className="w-full">
      {/* Header */}
      <div className="w-full bg-blue-900 text-white px-4 py-3">
        <div className="mx-auto max-w-xl">
          <div className="font-semibold">
            Table {seat.tableNumber} - {seat.direction}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <PlayerSearch label="" value={player} onChange={setPlayer} />

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
