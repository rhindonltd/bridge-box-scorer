"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isDirectorFor } from "@/lib/director-token";

interface Props {
  gameId: string;
  children: React.ReactNode;
}

/**
 * Client-side guard that ensures a valid director token exists in localStorage
 * for the given game. If not, redirects to the game selection page.
 */
export function DirectorGuard({ gameId, children }: Props) {
  const router = useRouter();

  const authorized = useMemo(() => isDirectorFor(gameId), [gameId]);

  useEffect(() => {
    if (!authorized) {
      router.replace("/manage/select-game");
    }
  }, [authorized, router]);

  if (!authorized) return null;

  return <>{children}</>;
}
