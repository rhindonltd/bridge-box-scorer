"use client";

import { useEffect, useState } from "react";
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
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isDirectorFor(gameId)) {
      setAuthorized(true);
    } else {
      router.replace("/manage/select-game");
    }
  }, [gameId, router]);

  if (authorized === null) return null; // Still checking

  return <>{children}</>;
}
