"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { verifyDirectorTokenWithServer } from "@/lib/director-token";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useGameStarted } from "@/hooks/game-started";

interface Props {
  gameId: string;
  children: React.ReactNode;
}

/**
 * Client-side guard for the manage screens. Authorization is decided by the
 * SERVER, not by the mere presence of a director token in localStorage — a
 * stale/bogus value must not unlock the manage UI. We verify the stored token
 * for this game against the server before rendering, and redirect to the game
 * selection page (clearing the stale token) when it isn't valid: Manage Game
 * for a started game, Create Game for one still being set up (it is only
 * listed there), where picking it again offers Become Director.
 */
export function DirectorGuard({ gameId, children }: Props) {
  const router = useRouter();
  const { state } = useAuthGuard(
    useCallback(() => verifyDirectorTokenWithServer(gameId), [gameId]),
  );

  const { started, isLoading } = useGameStarted(gameId);

  useEffect(() => {
    if (state === "unauthorized" && !isLoading) {
      router.replace(started ? "/manage" : "/create");
    }
  }, [state, isLoading, started, router]);

  if (state !== "authorized") return null;

  return <>{children}</>;
}
