"use client";

import { useState } from "react";
import { SocketEvents } from "@/socket/socket-events";
import { useFeatureSnapshot } from "@/hooks/use-feature-snapshot";
import type { PairScorecard } from "@/model/scorecard";

/**
 * This seat's live personal Scorecard.
 *
 * Follows the socket-only feature pattern (like the leaderboard and
 * travellers): on mount — and on reconnect — it requests the scorecard via
 * `scorecard:requestState`, which also joins the seat's scorecard room
 * server-side, then applies pushed `scorecard:sync` snapshots as results come
 * in. Leaves the room on unmount.
 *
 * `loading` is true until the first answer arrives; after that `card` is the
 * scorecard, or null when there is none (not a pairs game, or not started).
 */
export function useScorecard(
  gameId: string,
  seat: string,
): { card: PairScorecard | null; loading: boolean } {
  const [state, setState] = useState<{
    loaded: boolean;
    card: PairScorecard | null;
  }>({ loaded: false, card: null });

  useFeatureSnapshot<PairScorecard | null, PairScorecard | null>({
    requestEvent: SocketEvents.REQUEST_STATE_SCORECARD,
    syncEvent: SocketEvents.SCORECARD_SYNC,
    leaveEvent: SocketEvents.LEAVE_SCORECARD,
    params: { gameId, seat },
    apply: (payload) => setState({ loaded: true, card: payload ?? null }),
    onRequestError: () => setState({ loaded: true, card: null }),
    deps: [gameId, seat],
  });

  return { card: state.card, loading: !state.loaded };
}
