"use client";

import { useState } from "react";
import { SocketEvents } from "@/socket/socket-events";
import { useFeatureSnapshot } from "@/hooks/use-feature-snapshot";
import { BoardInstance } from "@/model/participants";

/** The acknowledged request snapshot: every requested board's instances. */
interface RoundResultsSnapshot {
  boards: { boardNumber: number; instances: BoardInstance[] }[];
}

/** A pushed live update: a single changed board's instances. */
interface RoundResultsSync {
  boardNumber: number;
  instances: BoardInstance[];
}

/** Whether a feature-snapshot payload is the full request snapshot. */
function isSnapshot(
  payload: RoundResultsSnapshot | RoundResultsSync,
): payload is RoundResultsSnapshot {
  return "boards" in payload;
}

/**
 * Live board instances for the end-of-round team results summary, keyed by
 * board number.
 *
 * Mirrors the leaderboard/traveller socket-only feature pattern: on mount (and
 * on reconnect) it requests the round's boards via `roundResults:requestState`
 * — which joins the game's round-results room server-side — then applies pushed
 * `roundResults:sync` updates (a single changed board) on top, so a late result
 * from the other room updates the affected board in place. Leaves the room on
 * unmount. `null` until the first snapshot arrives (loading).
 *
 * A sync for a board outside `boardNumbers` (another round) is ignored, so the
 * one game-wide room can serve every viewer without cross-round bleed.
 */
export function useRoundResults(
  gameId: string,
  boardNumbers: number[],
): Map<number, BoardInstance[]> | null {
  const [byBoard, setByBoard] = useState<Map<number, BoardInstance[]> | null>(
    null,
  );

  // A stable key so the effect only re-runs when the actual board set changes,
  // not on every render's fresh array identity.
  const boardsKey = boardNumbers.join(",");

  useFeatureSnapshot<RoundResultsSnapshot, RoundResultsSync>({
    requestEvent: SocketEvents.REQUEST_STATE_ROUND_RESULTS,
    syncEvent: SocketEvents.ROUND_RESULTS_SYNC,
    leaveEvent: SocketEvents.LEAVE_ROUND_RESULTS,
    // Leave only needs the gameId (the room is per game); the request also
    // carries which boards this viewer wants seeded.
    params: { gameId, boardNumbers },
    apply: (payload) => {
      if (!payload) {
        setByBoard(new Map());
        return;
      }
      if (isSnapshot(payload)) {
        setByBoard(
          new Map(payload.boards.map((b) => [b.boardNumber, b.instances])),
        );
        return;
      }
      // A single-board sync: ignore boards outside this round, otherwise merge.
      if (!boardNumbers.includes(payload.boardNumber)) return;
      setByBoard((prev) => {
        const next = new Map(prev ?? []);
        next.set(payload.boardNumber, payload.instances);
        return next;
      });
    },
    onRequestError: () => setByBoard(new Map()),
    deps: [gameId, boardsKey],
  });

  return byBoard;
}
