"use client";

import { Rounds } from "@/model/movement";
import MovementRound from "@/components/movement/MovementRound";

type Props = {
  name: string;
  rounds: Rounds;
};

export default function MovementRounds({ name, rounds }: Props) {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">{name}</h1>

      {rounds.rounds.map((round) => (
        <MovementRound key={round.round} round={round} />
      ))}
    </div>
  );
}
