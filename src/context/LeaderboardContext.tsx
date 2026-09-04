"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { getSocket, emitWithAck, emitEvent } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { useRequiredGame } from "@/context/GameContext";

export type SectionLeaderboard = OverallScoreAndParticipant & {
  section: string;
};

export interface LeaderboardSnapshot {
  leaderboard: OverallScoreAndParticipant;
  sections: SectionLeaderboard[];
}

interface LeaderboardContextType {
  leaderboard: OverallScoreAndParticipant | null;
  sections: SectionLeaderboard[];
  isLoading: boolean;
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(
  undefined,
);

/**
 * Feature-scoped provider for the live leaderboard. On mount (and on reconnect)
 * it requests the current leaderboard snapshot via the acknowledged
 * `leaderboard:requestState` event — which also joins the game's leaderboard
 * room server-side — then applies pushed `leaderboard:sync` snapshots on top.
 * On unmount it emits `leaderboard:leave` so the server stops recomputing for a
 * client that is no longer watching.
 */
export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const { game } = useRequiredGame();
  const gameId = game.gameId;

  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const socket = getSocket();
    let cancelled = false;

    function apply(data: LeaderboardSnapshot | null) {
      if (cancelled) return;
      if (data) setSnapshot(data);
      setIsLoading(false);
    }

    async function requestSnapshot() {
      try {
        const data = await emitWithAck<LeaderboardSnapshot | null>(
          SocketEvents.REQUEST_STATE_LEADERBOARD,
          { gameId },
        );
        apply(data);
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    }

    const handleSync = (data: LeaderboardSnapshot) => apply(data);
    socket.on(SocketEvents.LEADERBOARD_SYNC, handleSync);

    const handleReconnect = () => {
      void requestSnapshot();
    };
    socket.on(SocketEvents.CONNECT, handleReconnect);

    void requestSnapshot();

    return () => {
      cancelled = true;
      socket.off(SocketEvents.LEADERBOARD_SYNC, handleSync);
      socket.off(SocketEvents.CONNECT, handleReconnect);
      emitEvent(SocketEvents.LEAVE_LEADERBOARD, { gameId });
    };
  }, [gameId]);

  return (
    <LeaderboardContext.Provider
      value={{
        leaderboard: snapshot?.leaderboard ?? null,
        sections: snapshot?.sections ?? [],
        isLoading,
      }}
    >
      {children}
    </LeaderboardContext.Provider>
  );
}

export function useLeaderboardContext(): LeaderboardContextType {
  const ctx = useContext(LeaderboardContext);
  if (!ctx) {
    throw new Error(
      "useLeaderboardContext must be used within a LeaderboardProvider",
    );
  }
  return ctx;
}
