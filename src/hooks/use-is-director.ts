"use client";

import { useState } from "react";
import { isDirectorFor } from "@/lib/director-token";

/**
 * Whether this device holds the director token for a game.
 *
 * A presence check on the stored `director:<gameId>` token — optimistic, like
 * {@link isDirectorFor} used elsewhere (e.g. the manage game selection flow):
 * it decides whether to *show* a director affordance, not whether access is
 * granted. Actual manage access is still server-verified by `DirectorGuard`
 * when the director navigates into the manage screens.
 *
 * Read once on mount (director-ness does not change within a mounted screen);
 * held in state so it is stable across renders and safe against server-side
 * rendering (localStorage is only read in the client-only initializer).
 */
export function useIsDirector(gameId: string): boolean {
  const [director] = useState(() => isDirectorFor(gameId));
  return director;
}
