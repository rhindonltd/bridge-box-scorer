"use client";

import { Rounds } from "@/model/movement";
import MovementRound from "@/components/movement/MovementRound";

type Props = {
  rounds: Rounds;
};

export default function MovementRounds({ rounds }: Props) {
  return (
    <div className="p-6 space-y-4">
      {rounds.rounds.map((round) => (
        <MovementRound key={round.round} round={round} />
      ))}
    </div>
  );
}
