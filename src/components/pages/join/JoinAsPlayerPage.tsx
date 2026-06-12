"use client";

import { useState } from "react";
import { Seat } from "@/model/participants";
import { SelectSeatPage } from "./SelectSeatPage";
import { EnterPlayerNamesPage } from "./EnterPlayerNamesPage";
import { AwaitingMovementPage } from "./AwaitingMovementPage";
import { createFlow, useFlow } from "@/hooks/flow";

type JoinState = {
  seat: Seat | null;
  names: string | null;
};

const joinFlow = createFlow(
  {
    seat: {},

    names: {
      canEnter: (s: JoinState) => !!s.seat,
    },

    waiting: {
      canEnter: (s: JoinState) => !!s.seat && !!s.names,
    },
  },
  ["seat", "names", "waiting"] as const,
);

export default function JoinAsPlayerRoute() {
  const [seat, setSeat] = useState<Seat | null>(null);
  const [names, setNames] = useState<string | null>(null);

  const { step, goTo } = useFlow(joinFlow, { seat, names }, "/join/player");

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

  if (step === "names") {
    return (
      <EnterPlayerNamesPage
        seat={seat!}
        onSubmit={() => {
          setNames("value");
          goTo("waiting");
        }}
      />
    );
  }

  return <AwaitingMovementPage />;
}
