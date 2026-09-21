"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AuthState = "checking" | "authorized" | "unauthorized";

/**
 * Shared client-side auth-guard state machine used by the manage and settings
 * gates. Authorization is decided by the SERVER, not by the mere presence of a
 * token in localStorage, so `verify` asks the server; the hook tracks the
 * `checking → authorized | unauthorized` result.
 *
 * A `latestCheck` ref guards against a slow earlier check overwriting a newer
 * result. `recheck()` drops back to "checking" and re-runs `verify` — callers
 * use it after minting a fresh token or when the token changes in another tab.
 *
 * The hook does not decide what to do when unauthorized (redirect vs. prompt);
 * the caller reacts to `state`.
 */
export function useAuthGuard(verify: () => Promise<boolean>): {
  state: AuthState;
  recheck: () => void;
} {
  const [state, setState] = useState<AuthState>("checking");
  const [checkId, setCheckId] = useState(0);
  const latestCheck = useRef(0);

  useEffect(() => {
    const thisCheck = ++latestCheck.current;
    verify().then((valid) => {
      // Ignore a stale check that resolved after a newer one started.
      if (thisCheck !== latestCheck.current) return;
      setState(valid ? "authorized" : "unauthorized");
    });
    // Re-runs when the caller's `verify` closure changes (e.g. a new gameId, so
    // pass a useCallback-stable fn) or when recheck() bumps checkId.
  }, [verify, checkId]);

  // Bumping checkId re-runs the effect, which sets state back to "checking".
  const recheck = useCallback(() => setCheckId((n) => n + 1), []);

  return { state, recheck };
}
