import { useState } from "react";
import { NewPlayer } from "@/db/games/shared/tables/players";
import PlayerSearch from "@/components/pages/join/PlayerSearch";
import { PairSeat } from "@/model/participants";

interface Props {
  seat: PairSeat;
  onSubmitPair: (player1: NewPlayer, player2: NewPlayer) => void;
}

export default function EnterPairPlayerNames({ seat, onSubmitPair }: Props) {
  const [player1, setPlayer1] = useState<NewPlayer | null>(null);
  const [player2, setPlayer2] = useState<NewPlayer | null>(null);

  const player1Label = seat.direction === "NS" ? "North" : "East";
  const player2Label = seat.direction === "NS" ? "South" : "West";

  const canSubmit = player1 !== null && player2 !== null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <div className="space-y-6">
          <PlayerSearch
            label="Player 1"
            value={player1}
            onChange={setPlayer1}
          />

          <PlayerSearch
            label="Player 2"
            value={player2}
            onChange={setPlayer2}
          />
        </div>
      </div>

      <button
        disabled={!canSubmit}
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
  );
}
