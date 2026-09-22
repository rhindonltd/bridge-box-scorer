"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import {
  DirectionalLeaderboard,
  OverallScoreAndParticipant,
} from "@/model/leaderboard";
import { SocketEvents } from "@/socket/socket-events";
import { useRequiredGame } from "@/context/GameContext";
import { useFeatureSnapshot } from "@/hooks/use-feature-snapshot";

/**
 * One leaderboard "view" as delivered in a snapshot: the pooled ranking, plus —
 * for a two-winner pairs event — an optional NS/EW split (`directional`) the
 * room display renders as two side-by-side rankings.
 */
export type LeaderboardView = OverallScoreAndParticipant & {
  directional?: DirectionalLeaderboard;
};

export type SectionLeaderboard = LeaderboardView & {
  section: string;
};

export interface LeaderboardSnapshot {
  // Null when the director has turned off the combined overall ranking for a
  // multi-section event (sections stay separate).
  leaderboard: LeaderboardView | null;
  sections: SectionLeaderboard[];
}

interface LeaderboardContextType {
  leaderboard: LeaderboardView | null;
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

  useFeatureSnapshot<LeaderboardSnapshot, LeaderboardSnapshot>({
    requestEvent: SocketEvents.REQUEST_STATE_LEADERBOARD,
    syncEvent: SocketEvents.LEADERBOARD_SYNC,
    leaveEvent: SocketEvents.LEAVE_LEADERBOARD,
    params: { gameId },
    apply: (data) => {
      if (data) setSnapshot(data);
      setIsLoading(false);
    },
    onRequestError: () => setIsLoading(false),
    deps: [gameId],
  });

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
