"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { getSocket, emitWithAck } from "../lib/socket";
import { SocketEvents } from "../socket/socket-events";
import { Deal } from "@/model/common";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { getPlayerToken } from "@/lib/player-token";
import { useSocketRevalidate } from "./use-socket-revalidate";
import {
  initialPlayState,
  playReducer,
  type PlayAction,
  type PlayState,
  type Schedule,
} from "./play-state-machine";

// Re-exported for existing consumers that import these types from the hook.
export type { RoundSchedule, SeatPlayer } from "./play-state-machine";

export function usePlayFlow(
  gameId: string,
  seat: string,
  handEntryEnabled = false,
  teamRoundResults = false,
) {
  const [playState, setPlayState] = useState<PlayState>({
    state: "loading",
  });

  /*
   * Fetch the schedule via SWR. The route returns the Schedule object
   * directly (unwrapped from the success envelope by `fetcher`).
   *
   * Before the director starts the game there is no assignment for this seat,
   * so the route responds 404 and `error.status` is 404. That is the expected
   * "seated, waiting for the game to start" state (not a failure), so we don't
   * retry on 404 — a `GAME_UPDATED` broadcast at start revalidates instead.
   */
  const scheduleKey = swrKeys.schedule(gameId, seat);
  const { data: fetchedSchedule, error: scheduleError } = useSWR<Schedule>(
    scheduleKey,
    fetcher,
    {
      shouldRetryOnError: (error: Error & { status?: number }) =>
        error.status !== 404,
    },
  );

  // The schedule route (per-game DB) doesn't know the game-level
  // `handEntryEnabled` flag, which lives on the game-index row and reaches us
  // via GameContext (same path as `leadCardRequired`). Stamp it onto the
  // schedule so the pure reducer can gate the optional post-round deal step.
  const schedule = useMemo(
    () =>
      fetchedSchedule && fetchedSchedule.rounds
        ? { ...fetchedSchedule, handEntryEnabled, teamRoundResults }
        : null,
    [fetchedSchedule, handEntryEnabled, teamRoundResults],
  );

  // The seat has no schedule yet because the game hasn't been started
  // (materialization creates the assignment rows the schedule needs). Distinct
  // from the brief initial load, where there is neither data nor error yet.
  const waitingToStart =
    !schedule &&
    (scheduleError as (Error & { status?: number }) | undefined)?.status ===
      404;

  /*
   * Keep the latest schedule in a ref so socket event handlers and the
   * action dispatcher don't need to be recreated whenever schedule changes.
   */
  const scheduleRef = useRef<Schedule | null>(null);

  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  /*
   * Drive the pure play-flow state machine. Every transition goes through the
   * reducer against the latest schedule; the reducer returns the state
   * unchanged when an action does not apply, so callers can dispatch freely.
   */
  const dispatch = useCallback((action: PlayAction) => {
    setPlayState((prev) => playReducer(prev, action, scheduleRef.current));
  }, []);

  /*
   * When the director starts the game, boards/assignments are materialized and
   * a `GAME_UPDATED` broadcast goes to the game room. Revalidate the schedule
   * then (and on reconnect) so a waiting player advances into play without a
   * manual refresh.
   */
  useSocketRevalidate(scheduleKey, [SocketEvents.GAME_UPDATED], [scheduleKey]);

  /*
   * Initialise the play state once per (gameId, seat). Background SWR
   * revalidations may hand back a fresh schedule object, but we must not
   * reset the player back to the starting round mid-session, so the
   * derived starting state is computed only the first time a schedule is
   * seen for this key.
   */
  const initialisedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${gameId}/${seat}`;

    if (!schedule) {
      if (initialisedKeyRef.current !== key) {
        setPlayState({ state: "loading" });
      }
      return;
    }

    if (initialisedKeyRef.current === key) {
      return;
    }

    initialisedKeyRef.current = key;
    setPlayState(initialPlayState(schedule));
  }, [schedule, gameId, seat]);

  /*
   * Socket listeners.
   *
   * This effect intentionally has an empty dependency array; the listeners are
   * registered once for this hook instance and dispatch through the stable
   * `dispatch` callback (which reads the latest schedule via scheduleRef).
   */
  useEffect(() => {
    const socket = getSocket();

    const onConfirmed = (payload: {
      roundNumber: number;
      tableNumber: number;
      boardNumber: number;
    }) => {
      dispatch({ type: "boardConfirmed", ...payload });
    };

    const onMismatch = (payload: {
      roundNumber: number;
      tableNumber: number;
      nsBoardNumber: number;
      nsResult: string;
      ewBoardNumber: number;
      ewResult: string;
    }) => {
      dispatch({ type: "boardMismatch", ...payload });
    };

    socket.on(SocketEvents.BOARD_CONFIRMED, onConfirmed);
    socket.on(SocketEvents.BOARD_MISMATCH, onMismatch);

    return () => {
      socket.off(SocketEvents.BOARD_CONFIRMED, onConfirmed);
      socket.off(SocketEvents.BOARD_MISMATCH, onMismatch);
    };
  }, [dispatch]);

  /*
   * Submit a result. The board the player entered in the wizard is
   * authoritative. We run the pure reducer to decide the transition, then —
   * only when it actually moves to "waiting" (round present and the board
   * belongs to it) — emit the submission and commit the new state. Keeping the
   * emit out of the state updater keeps the updater pure.
   */
  const submitResult = useCallback(
    (boardNumber: number, result: string) => {
      const currentSchedule = scheduleRef.current;
      if (!currentSchedule) return;

      const next = playReducer(
        playState,
        { type: "submit", boardNumber },
        currentSchedule,
      );

      // The transition was rejected (wrong phase, missing round, or a board
      // outside this round): do not emit or change state.
      if (next.state !== "waiting") return;

      const round = currentSchedule.rounds[next.roundIndex];

      // Attach the seat's player token so the server can verify the submission
      // came from this seat's owner. `seat` is the initial seat, which is also
      // the key the token was stored under at join time.
      const token = getPlayerToken(gameId)?.token ?? "";

      getSocket().emit(SocketEvents.SUBMIT_RESULT, {
        gameId,
        seat,
        token,
        roundNumber: round.roundNumber,
        tableNumber: round.tableNumber,
        boardNumber,
        result,
      });

      setPlayState(next);
    },
    [gameId, seat, playState],
  );

  const handleEnterRound = useCallback(
    () => dispatch({ type: "enterRound" }),
    [dispatch],
  );
  const handleReenter = useCallback(
    () => dispatch({ type: "reenter" }),
    [dispatch],
  );
  const handleBoardResultsNext = useCallback(
    () => dispatch({ type: "boardResultsNext" }),
    [dispatch],
  );
  const handleMoveInfoContinue = useCallback(
    () => dispatch({ type: "moveInfoContinue" }),
    [dispatch],
  );
  const handleSitOutContinue = useCallback(
    () => dispatch({ type: "sitOutContinue" }),
    [dispatch],
  );
  const handleDealsContinue = useCallback(
    () => dispatch({ type: "dealsContinue" }),
    [dispatch],
  );
  const handleRoundResultsContinue = useCallback(
    () => dispatch({ type: "roundResultsContinue" }),
    [dispatch],
  );

  /**
   * Submit the entered cards for a board (from the optional post-round deal
   * step). Global first-wins: the ack's `stored` is false when another player
   * had already entered that board, so the caller can show it read-only. A
   * rejected ack (bad deal / not found) rejects the promise. Emitting the deal
   * has no effect on the play-flow state — the deal step is purely additive.
   */
  const submitDeal = useCallback(
    async (boardNumber: number, deal: Deal): Promise<{ stored: boolean }> => {
      const token = getPlayerToken(gameId)?.token ?? "";
      return emitWithAck<{ stored: boolean }>(SocketEvents.DEAL_SUBMIT, {
        gameId,
        seat,
        token,
        boardNumber,
        deal,
      });
    },
    [gameId, seat],
  );

  return {
    schedule,
    playState,
    waitingToStart,

    handleSitOutContinue,
    handleMoveInfoContinue,
    handleBoardResultsNext,
    handleRoundResultsContinue,
    handleDealsContinue,
    handleReenter,
    handleEnterRound,
    submitResult,
    submitDeal,
  };
}
