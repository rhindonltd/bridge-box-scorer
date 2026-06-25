"use client";

import { useState } from "react";
import { Seat } from "@/model/participants";
import { SelectSeatPage } from "./SelectSeatPage";
import { AwaitingMovementPage } from "./AwaitingMovementPage";
import { createFlow, useFlow } from "@/hooks/flow";
import { useGame } from "@/context/GameContext";

type JoinState = {
  seat: Seat | null;
  names: string | null;
};

const joinFlow = createFlow(
  {
    seat: {},

    waiting: {
      canEnter: (s: JoinState) => !!s.seat && !!s.names,
    },
  },
  ["seat", "names", "waiting"] as const,
);

export default function JoinAsPlayerPage() {
  const { game } = useGame();

  const [seat, setSeat] = useState<Seat | null>(null);
  const [names, setNames] = useState<string | null>(null);

  const { step, goTo } = useFlow(
    joinFlow,
    { seat, names },
    `/join/${game!.gameId}/player`,
  );

  if (step === "seat") {
    return (
      <SelectSeatPage
        onSeatSelected={(s) => {
          setSeat(s);
          goTo("names");
        }}
      />
    );
  }

  return <AwaitingMovementPage />;
}
