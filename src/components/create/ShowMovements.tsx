"use client";

import { PairMovement } from "@/db/games/pairs/tables/movements";

type Props = {
  movements: PairMovement[];
};

export function ShowMovements({ movements }: Props) {
  return (
    <div>
      <span>{JSON.stringify(movements)}</span>
    </div>
  );
}
