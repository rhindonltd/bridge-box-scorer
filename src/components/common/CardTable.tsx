import PlayerCard from "@/components/common/PlayerCard";
import React from "react";

interface Players {
  N: Omit<Player, "id"> | null;
  S: Omit<Player, "id"> | null;
  E: Omit<Player, "id"> | null;
  W: Omit<Player, "id"> | null;
}

interface Props {
  tableNumber: number;
  players: Players;
  /**
   * §2.4.7: the opponents at this table are marked "expected late" and have not
   * arrived. Their (empty) seats then read "Late" instead of "Empty", so the
   * waiting pair sees who is missing rather than a blank sit-out. Only affects
   * empty seats, so the seated pair's own cards are unchanged.
   */
  opponentExpectedLate?: boolean;
}

import TableCompassLayout from "@/components/layout/TableCompassLayout";
import { Player } from "@/db/games/tables/players";

export default function CardTable({
  players,
  tableNumber,
  opponentExpectedLate = false,
}: Props) {
  return (
    <TableCompassLayout
      north={
        <PlayerCard
          label="North"
          player={players.N}
          expectedLate={opponentExpectedLate}
        />
      }
      south={
        <PlayerCard
          label="South"
          player={players.S}
          expectedLate={opponentExpectedLate}
        />
      }
      west={
        <PlayerCard
          label="West"
          player={players.W}
          expectedLate={opponentExpectedLate}
        />
      }
      east={
        <PlayerCard
          label="East"
          player={players.E}
          expectedLate={opponentExpectedLate}
        />
      }
      center={
        <div className="flex flex-col items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg">
          <div className="text-[10px] font-bold">Table</div>
          <div className="text-xl font-bold">{tableNumber}</div>
        </div>
      }
    />
  );
}
