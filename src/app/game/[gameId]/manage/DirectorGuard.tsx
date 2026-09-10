"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { verifyDirectorTokenWithServer } from "@/lib/director-token";

interface Props {
  gameId: string;
  children: React.ReactNode;
}

type AuthState = "checking" | "authorized" | "unauthorized";

/**
 * Client-side guard for the manage screens. Authorization is decided by the
 * SERVER, not by the mere presence of a director token in localStorage — a
 * stale/bogus value must not unlock the manage UI. We verify the stored token
 * for this game against the server before rendering, and redirect to the game
 * selection page (clearing the stale token) when it isn't valid.
 */
export function DirectorGuard({ gameId, children }: Props) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>("checking");
  const latestCheck = useRef(0);

  useEffect(() => {
    const thisCheck = ++latestCheck.current;
    verifyDirectorTokenWithServer(gameId).then((valid) => {
      if (thisCheck !== latestCheck.current) return;
      setState(valid ? "authorized" : "unauthorized");
    });
  }, [gameId]);

  useEffect(() => {
    if (state === "unauthorized") {
      router.replace("/manage");
    }
  }, [state, router]);

  if (state !== "authorized") return null;

  return <>{children}</>;
}
