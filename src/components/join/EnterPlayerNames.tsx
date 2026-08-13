import { useState } from "react";
import { NewPlayer } from "@/db/games/shared/tables/players";
import PlayerSearch from "@/components/pages/join/PlayerSearch";
import { parseSeat, Seat } from "@/model/participants";

interface Props {
  seat: Seat;
  onSubmitPair: (player1: NewPlayer, player2: NewPlayer) => void;
}

export default function EnterPlayerNames({ seat, onSubmitPair }: Props) {
  const [player1, setPlayer1] = useState<NewPlayer | null>(null);
  const [player2, setPlayer2] = useState<NewPlayer | null>(null);

  const parsedSeat = parseSeat(seat);

  const player1Label = parsedSeat.direction === "NS" ? "North" : "East";
  const player2Label = parsedSeat.direction === "NS" ? "South" : "West";

  const canSubmit = player1 !== null && player2 !== null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="w-full bg-blue-900 text-white px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-xl font-semibold">
          Table {parsedSeat.tableNumber}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-xl space-y-4 p-4">
        <div className="space-y-6">
          <PlayerSearch
            label={player1Label}
            value={player1}
            onChange={setPlayer1}
          />

          <PlayerSearch
            label={player2Label}
            value={player2}
            onChange={setPlayer2}
          />
        </div>

        <button
          disabled={!canSubmit}
          onClick={() => onSubmitPair(player1!, player2!)}
          className="
            w-full
            rounded-xl
            bg-blue-600
            py-3
            font-medium
            text-white
            disabled:opacity-50
          "
        >
          Enter Pair
        </button>
      </div>
    </div>
  );
}
