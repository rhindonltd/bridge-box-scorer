"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { BoardInstance } from "@/model/participants";
import { SocketEvents } from "@/socket/socket-events";
import { useRequiredGame } from "@/context/GameContext";
import { useFeatureSnapshot } from "@/hooks/use-feature-snapshot";

interface TravellerSnapshot {
  instances: BoardInstance[];
}

interface TravellerContextType {
  instances: BoardInstance[];
  isLoading: boolean;
}

const TravellerContext = createContext<TravellerContextType | undefined>(
  undefined,
);

/**
 * Feature-scoped provider for a single board's traveller. Parameterised by
 * `boardNumber`: when the viewer switches boards, the provider leaves the old
 * board's traveller room and requests/joins the new one. On mount (and on
 * reconnect) it requests the current instances via the acknowledged
 * `traveller:requestState` event (which joins the per-board room server-side),
 * then applies pushed `traveller:sync` snapshots on top. Leaves the room on
 * unmount / board switch so the server stops recomputing for it.
 */
export function TravellerProvider({
  boardNumber,
  children,
}: {
  boardNumber: number;
  children: ReactNode;
}) {
  const { game } = useRequiredGame();
  const gameId = game.gameId;

  // The board the currently-held instances belong to. Until a snapshot for the
  // active `boardNumber` has arrived, the view is loading. Tracking the loaded
  // board (rather than a synchronous `setLoading(true)` on board change) keeps
  // the effect free of cascading synchronous setState.
  const [loaded, setLoaded] = useState<{
    board: number;
    instances: BoardInstance[];
  } | null>(null);

  useFeatureSnapshot<TravellerSnapshot, TravellerSnapshot>({
    requestEvent: SocketEvents.REQUEST_STATE_TRAVELLER,
    syncEvent: SocketEvents.TRAVELLER_SYNC,
    leaveEvent: SocketEvents.LEAVE_TRAVELLER,
    params: { gameId, boardNumber },
    apply: (data) => {
      if (!data) return;
      setLoaded({ board: boardNumber, instances: data.instances });
    },
    deps: [gameId, boardNumber],
  });

  const isForCurrentBoard = loaded?.board === boardNumber;
  const instances = isForCurrentBoard ? loaded!.instances : [];
  const isLoading = !isForCurrentBoard;

  return (
    <TravellerContext.Provider value={{ instances, isLoading }}>
      {children}
    </TravellerContext.Provider>
  );
}

export function useTravellerContext(): TravellerContextType {
  const ctx = useContext(TravellerContext);
  if (!ctx) {
    throw new Error(
      "useTravellerContext must be used within a TravellerProvider",
    );
  }
  return ctx;
}
